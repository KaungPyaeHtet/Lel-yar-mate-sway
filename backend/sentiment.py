"""
News → sentiment score for the rice XGBoost feature (roughly [-1, 1]).

1) **Lexical layer** — English + Burmese commodity / price phrases (always on).
   Catches clear “prices up / export ban / harvest” style headlines that often
   sit near 0 for embedding cosine models.

2) **Neural layer** — ClimateBERT `distilroberta-base-climate-f` (default): mean-pooled
   embeddings vs bullish/bearish anchors, plus `_keyword_adjustment`.
   Set CLIMATE_USE_SENTIMENT_HEAD=1 for `distilroberta-base-climate-sentiment`.

Final score blends lexical + neural (lexical-weighted) so RSS titles move the needle.

Set RICE_SENTIMENT_MOCK=1 to skip transformers (lexical + keywords only).
"""

from __future__ import annotations

import backend.native_env  # noqa: F401 — before NumPy / torch native libs

import os
import re
import threading
from functools import lru_cache
from typing import Iterable

import numpy as np

try:
    import torch

    # Avoid OpenMP/thread clashes with XGBoost on macOS (PyTorch before xgb load_model segfaults).
    torch.set_num_threads(1)
    torch.set_num_interop_threads(1)

    from transformers import (
        AutoModelForMaskedLM,
        AutoTokenizer,
        AutoModelForSequenceClassification,
    )
    from transformers.utils import logging as hf_logging

    # Quieter console; checkpoint may list UNEXPECTED keys (e.g. position_ids) — see docstring below.
    hf_logging.set_verbosity_error()
except ImportError:  # pragma: no cover — optional; mock / CI without torch
    torch = None  # type: ignore[misc, assignment]
    AutoModelForMaskedLM = None  # type: ignore[misc, assignment]
    AutoTokenizer = None  # type: ignore[misc, assignment]
    AutoModelForSequenceClassification = None  # type: ignore[misc, assignment]
    hf_logging = None  # type: ignore[misc, assignment]

CLIMATE_F_MODEL = "climatebert/distilroberta-base-climate-f"
CLIMATE_SENTIMENT_MODEL = "climatebert/distilroberta-base-climate-sentiment"

# Rice / ag supply-demand anchors (English; encode once with climate-f)
_BULL_ANCHORS = (
    "Strong export demand and tight global rice inventories support higher prices.",
    "Bumper procurement and rising futures point to bullish rice market sentiment.",
)
_BEAR_ANCHORS = (
    "Severe weather destroyed crops and raised fears of supply shortfalls and inflation.",
    "Export restrictions and logistical bottlenecks disrupted commodity availability.",
)

_HIGH_IMPACT_NEG = (
    "drought",
    "flood",
    "export ban",
    "embargo",
    "crop failure",
    "shortage",
    "cyclone",
    "heatwave",
)
_HIGH_IMPACT_POS = (
    "record harvest",
    "bumper crop",
    "export surge",
    "strong demand",
    "supply tight",
)
# "monsoon" amplifies whichever direction the base score already suggests
_MONSOON = "monsoon"

# Headline phrase hits (English, lowercased cleaned text) — rice / ag / macro.
_LEX_BULLISH_EN = (
    "export ban",
    "export curb",
    "export restriction",
    "supply tight",
    "tight inventories",
    "crop failure",
    "crop loss",
    "food insecurity",
    "price surge",
    "prices surge",
    "rice futures",
    "grain futures",
    "commodities rally",
    "shortage of",
    "shortage in",
    "sanctions",
    "inflation shock",
    "demand surge",
    "logistics disruption",
    "port congestion",
    "heatwave",
    "cyclone",
    "flood damage",
    "price rise",
    "prices rise",
    "surge in price",
    "jump in price",
    "oil prices jump",
    "crude oil rises",
    "brent crude higher",
    "fuel costs surge",
)
_LEX_BEARISH_EN = (
    "record harvest",
    "bumper crop",
    "oversupply",
    "glut",
    "ceasefire",
    "peace deal",
    "truce",
    "export resumed",
    "tariff cut",
    "sanctions eased",
    "price drop",
    "prices fall",
    "prices fell",
    "futures ease",
    "bearish",
    "selloff",
    "surplus",
    "reserves released",
    "disinflation",
    "price decline",
    "prices decline",
    "eased prices",
    "oil prices fall",
    "crude oil slides",
    "brent crude lower",
    "fuel prices drop",
)

# Burmese titles (search original string; common price / trend words).
_LEX_BULLISH_MY = (
    "ဈေးတက်",
    "စျေးတက်",
    "တက်လာ",
    "တိုးတက်",
    "မြင့်တက်",
)
_LEX_BEARISH_MY = (
    "ဈေးကျ",
    "စျေးကျ",
    "ကျဆင်း",
    "လျော့ကျ",
    "လျော့",
)

# Serialize torch forwards (OpenMP + multi-library macOS builds).
_TORCH_GUARD = threading.Lock()


def _clean_text(text: str) -> str:
    t = text.lower().strip()
    t = re.sub(r"http\S+", " ", t)
    t = re.sub(r"[^\w\s\-\.\,\'\%]", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def _keyword_adjustment(text: str) -> tuple[float, float]:
    """
    Returns (additive_delta, magnitude_multiplier).
    Negative keywords push bearish; positive push bullish; monsoon boosts |score|.
    """
    lo = text.lower()
    neg_hits = sum(1 for k in _HIGH_IMPACT_NEG if k in lo)
    pos_hits = sum(1 for k in _HIGH_IMPACT_POS if k in lo)
    monsoon = _MONSOON in lo

    delta = 0.0
    delta -= 0.12 * min(neg_hits, 4)
    delta += 0.12 * min(pos_hits, 4)

    # Oil / fuel direction (transport & input costs → commodity price channel)
    if any(k in lo for k in ("oil", "crude", "brent", "wti", "fuel", "diesel", "gasoline")):
        up = any(
            w in lo
            for w in (
                "rise",
                "rises",
                "rising",
                "surge",
                "jump",
                "soar",
                "higher",
                "gain",
                "gains",
                "climb",
                "increase",
                "rally",
            )
        )
        down = any(
            w in lo
            for w in (
                "fall",
                "falls",
                "fell",
                "drop",
                "drops",
                "plunge",
                "slide",
                "lower",
                "decline",
                "decrease",
                "crash",
                "slump",
            )
        )
        if up and not down:
            delta += 0.07
        elif down and not up:
            delta -= 0.06

    if monsoon:
        if "failure" in lo or "deficit" in lo or "weak" in lo:
            delta -= 0.08
        elif "good" in lo or "normal" in lo or "above" in lo:
            delta += 0.06
        else:
            delta += 0.03  # slight positive prior for monsoon mentions

    mult = 1.0 + 0.08 * min(neg_hits + pos_hits + (1 if monsoon else 0), 6)
    return delta, mult


def _score_headline_lexical(text: str) -> float:
    """
    Keyword / phrase tilt from headline text (EN + MY), merged with _keyword_adjustment.
    Stronger signal for typical short RSS titles than embedding cosine alone.
    """
    raw = str(text).strip()
    if not raw:
        return 0.0
    cleaned = _clean_text(raw)
    lo = cleaned.lower() if cleaned else raw.lower()

    up = sum(1 for p in _LEX_BULLISH_EN if p in lo)
    down = sum(1 for p in _LEX_BEARISH_EN if p in lo)
    up += sum(1 for p in _LEX_BULLISH_MY if p in raw)
    down += sum(1 for p in _LEX_BEARISH_MY if p in raw)

    spread = min(8, max(-8, up - down))
    base = float(np.tanh(spread * 0.28))
    d, mult = _keyword_adjustment(lo)
    return float(np.clip(base * mult + d, -1.0, 1.0))


def _aggregate_lexical(headlines_list: list[str]) -> float:
    scores = [_score_headline_lexical(h) for h in headlines_list if str(h).strip()]
    if not scores:
        return 0.0
    return float(np.mean(scores))


def _cosine(a: torch.Tensor, b: torch.Tensor) -> torch.Tensor:
    a = torch.nn.functional.normalize(a, dim=-1)
    b = torch.nn.functional.normalize(b, dim=-1)
    return (a * b).sum(dim=-1)


@lru_cache(maxsize=1)
def _climate_f_encoder():
    tok = AutoTokenizer.from_pretrained(CLIMATE_F_MODEL)
    # Checkpoint is RobertaForMaskedLM; AutoModel → RobertaModel mismatches (missing pooler, stray lm_head).
    mlm = AutoModelForMaskedLM.from_pretrained(CLIMATE_F_MODEL)
    model = mlm.roberta
    model.eval()
    return tok, model


@lru_cache(maxsize=1)
def _climate_sentiment_classifier():
    tok = AutoTokenizer.from_pretrained(CLIMATE_SENTIMENT_MODEL)
    model = AutoModelForSequenceClassification.from_pretrained(
        CLIMATE_SENTIMENT_MODEL
    )
    model.eval()
    return tok, model


def _encode_mean_pool(
    texts: Iterable[str], tok, model, device: torch.device
) -> torch.Tensor:
    enc = tok(
        list(texts),
        padding=True,
        truncation=True,
        max_length=256,
        return_tensors="pt",
    ).to(device)
    with torch.no_grad():
        out = model(**enc).last_hidden_state
    mask = enc["attention_mask"].unsqueeze(-1)
    summed = (out * mask).sum(dim=1)
    counts = mask.sum(dim=1).clamp(min=1)
    return summed / counts


def _score_headline_climate_f(text: str, device: torch.device) -> float:
    tok, model = _climate_f_encoder()
    model.to(device)
    bull = _encode_mean_pool(_BULL_ANCHORS, tok, model, device).mean(dim=0, keepdim=True)
    bear = _encode_mean_pool(_BEAR_ANCHORS, tok, model, device).mean(dim=0, keepdim=True)
    h = _encode_mean_pool([text], tok, model, device)
    cb = _cosine(h, bull).item()
    cr = _cosine(h, bear).item()
    raw = (cb - cr) / 2.0
    return float(np.tanh(raw * 2.5))


def _score_headline_sentiment_head(text: str, device: torch.device) -> float:
    """Map risk(0) / neutral(1) / opportunity(2) → roughly [-1, 1]."""
    tok, model = _climate_sentiment_classifier()
    model.to(device)
    enc = tok(
        text,
        truncation=True,
        max_length=256,
        return_tensors="pt",
    ).to(device)
    with torch.no_grad():
        logits = model(**enc).logits[0]
        probs = torch.softmax(logits, dim=-1).cpu().numpy()
    # 0 risk, 1 neutral, 2 opportunity
    return float(probs[2] - probs[0])


def _one_headline_score(text: str, device: torch.device) -> float:
    cleaned = _clean_text(text)
    if not cleaned:
        return 0.0
    use_head = os.environ.get("CLIMATE_USE_SENTIMENT_HEAD", "").lower() in (
        "1",
        "true",
        "yes",
    )
    if use_head:
        base = _score_headline_sentiment_head(cleaned, device)
    else:
        base = _score_headline_climate_f(cleaned, device)

    d, mult = _keyword_adjustment(cleaned)
    v = base * mult + d
    return float(np.clip(v, -1.0, 1.0))


def get_rice_market_sentiment(headlines_list: list[str]) -> float:
    """
    Aggregate sentiment for headlines into one float in [-1, 1].

    Lexical (EN/MY phrases + ag keywords) is blended with the neural ClimateBERT score
    so commodity headlines are not stuck at ~0. RICE_SENTIMENT_MOCK=1 → lexical only.
    """
    lex = _aggregate_lexical(headlines_list)
    if os.environ.get("RICE_SENTIMENT_MOCK", "").lower() in ("1", "true", "yes"):
        return float(np.clip(lex, -1.0, 1.0))
    if not headlines_list:
        return float(np.clip(lex, -1.0, 1.0))
    if torch is None:
        return float(np.clip(lex, -1.0, 1.0))
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    with _TORCH_GUARD:
        scores = [_one_headline_score(h, device) for h in headlines_list if str(h).strip()]
    neural = float(np.mean(scores)) if scores else 0.0
    # Lexical carries explicit price/ag language; neural adds softer context.
    w_lex = 0.68
    if abs(neural) < 0.05:
        w_lex = 0.82
    blend = w_lex * lex + (1.0 - w_lex) * neural
    return float(np.clip(blend, -1.0, 1.0))
