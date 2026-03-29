"""
Lexical features from `news_headline` for XGBoost (complements neural sentiment).

Trees can use these counts directly; they align with themes in RSS / sheet training text:
oil & energy, logistics, policy, agriculture, weather, and explicit up/down price language.
"""

from __future__ import annotations

import re
from typing import Any

# Lowercase substrings (English-focused; matches Google News style titles).
_OIL_ENERGY = (
    "oil",
    "crude",
    "brent",
    "wti",
    "diesel",
    "petrol",
    "gasoline",
    "fuel",
    "opec",
    "energy",
    "barrel",
    "refinery",
)
_TRANSPORT = (
    "transport",
    "logistics",
    "shipping",
    "freight",
    "cargo",
    "port",
    "vessel",
    "supply chain",
    "truck",
    "rail",
)
_POLICY = (
    "government",
    "ministry",
    "policy",
    "parliament",
    "sanction",
    "subsidy",
    "tariff",
    "export ban",
    "import ban",
    "regulation",
    "central bank",
    "imf",
)
_AG = (
    "agriculture",
    "farming",
    "farm",
    "crop",
    "harvest",
    "paddy",
    "rice",
    "wheat",
    "grain",
    "fertilizer",
    "commodity",
    "food security",
    "mandi",
    "wholesale",
)
_WEATHER = (
    "weather",
    "monsoon",
    "rain",
    "drought",
    "flood",
    "cyclone",
    "typhoon",
    "heatwave",
    "climate",
    "storm",
    "el niño",
    "elnino",
)
_UP = (
    "rise",
    "rises",
    "rising",
    "surge",
    "jump",
    "soar",
    "gain",
    "gains",
    "higher",
    "increase",
    "climb",
    "rally",
    "spike",
    "upward",
)
_DOWN = (
    "fall",
    "falls",
    "fell",
    "drop",
    "drops",
    "plunge",
    "slide",
    "slump",
    "lower",
    "decline",
    "decrease",
    "crash",
    "cut",
    "cuts",
    "ease",
    "tumble",
    "downward",
)

NEWS_FEATURE_NAMES: tuple[str, ...] = (
    "nf_oil_energy",
    "nf_transport",
    "nf_policy",
    "nf_ag",
    "nf_weather",
    "nf_price_up",
    "nf_price_down",
)


def _norm_text(s: str) -> str:
    t = str(s).lower()
    t = re.sub(r"http\S+", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def _hits(lo: str, kws: tuple[str, ...]) -> int:
    return sum(1 for k in kws if k in lo)


def lexical_news_features(headline_cell: Any) -> dict[str, float]:
    """
    Build numeric features from one CSV cell (can contain several sentences, ';' or '.').
    Values are capped hit counts so trees stay stable on long blobs.
    """
    raw = str(headline_cell) if headline_cell is not None else ""
    lo = _norm_text(raw)
    cap = 6.0
    return {
        "nf_oil_energy": float(min(cap, _hits(lo, _OIL_ENERGY))),
        "nf_transport": float(min(cap, _hits(lo, _TRANSPORT))),
        "nf_policy": float(min(cap, _hits(lo, _POLICY))),
        "nf_ag": float(min(cap, _hits(lo, _AG))),
        "nf_weather": float(min(cap, _hits(lo, _WEATHER))),
        "nf_price_up": float(min(cap, _hits(lo, _UP))),
        "nf_price_down": float(min(cap, _hits(lo, _DOWN))),
    }


def add_lexical_news_columns(df, headline_col: str = "news_headline"):
    """Mutates df in place with nf_* columns."""
    feats = [lexical_news_features(h) for h in df[headline_col]]
    for name in NEWS_FEATURE_NAMES:
        df[name] = [f[name] for f in feats]
    return df
