"""
News → sentiment score using ClimateBERT `distilroberta-base-climate-f`.

Hugging Face may print `roberta.embeddings.position_ids | UNEXPECTED`: the hub file
still carries that buffer while current RoBERTa code does not load it; weights that
matter are applied — safe to ignore.

That checkpoint is a masked LM (not a classifier). We use mean-pooled embeddings
and cosine similarity to bullish vs bearish rice-market anchor texts, then apply
keyword-based weighting. Optional: set CLIMATE_USE_SENTIMENT_HEAD=1 to use
`distilroberta-base-climate-sentiment` (3-class risk/neutral/opportunity) instead.
"""

from __future__ import annotations

import backend.native_env  # noqa: F401 — before NumPy / torch native libs

import os
import re
import threading
from functools import lru_cache
from typing import Iterable

import numpy as np
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
    if monsoon:
        if "failure" in lo or "deficit" in lo or "weak" in lo:
            delta -= 0.08
        elif "good" in lo or "normal" in lo or "above" in lo:
            delta += 0.06
        else:
            delta += 0.03  # slight positive prior for monsoon mentions

    mult = 1.0 + 0.08 * min(neg_hits + pos_hits + (1 if monsoon else 0), 6)
    return delta, mult


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


def _mock_sentiment_from_keywords(headlines_list: list[str]) -> float:
    """Keyword-only score for fast tests without downloading models (RICE_SENTIMENT_MOCK=1)."""
    scores = []
    for h in headlines_list:
        c = _clean_text(str(h))
        if not c:
            continue
        base = 0.0
        d, mult = _keyword_adjustment(c)
        v = np.clip(base * mult + d, -1.0, 1.0)
        scores.append(v)
    return float(np.mean(scores)) if scores else 0.0


def get_rice_market_sentiment(headlines_list: list[str]) -> float:
    """
    Aggregate sentiment for a list of headlines into one float in [-1, 1].

    Uses `climatebert/distilroberta-base-climate-f` by default (embedding anchors).
    Set RICE_SENTIMENT_MOCK=1 to skip transformers (keyword heuristic only).
    """
    if os.environ.get("RICE_SENTIMENT_MOCK", "").lower() in ("1", "true", "yes"):
        return _mock_sentiment_from_keywords(headlines_list)
    if not headlines_list:
        return 0.0
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    with _TORCH_GUARD:
        scores = [_one_headline_score(h, device) for h in headlines_list if str(h).strip()]
    if not scores:
        return 0.0
    return float(np.mean(scores))
