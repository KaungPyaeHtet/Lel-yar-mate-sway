#!/usr/bin/env python3
"""
Quick exploratory report: correlation of lexical news features (nf_*) and sentiment
with next-day % price change on your training CSV.

Run after regenerating rice_data.csv:
  RICE_SENTIMENT_MOCK=1 python backend/report_news_corr.py --csv backend/data/rice_data.csv
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import backend.native_env  # noqa: F401

import pandas as pd

from backend.news_features import NEWS_FEATURE_NAMES, lexical_news_features
from backend.sentiment import get_rice_market_sentiment


def _headlines_cell(s: str) -> list[str]:
    parts = [p.strip() for p in s.replace(";", ".").split(".") if p.strip()]
    return parts if parts else ([s.strip()] if s.strip() else [])


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--csv",
        type=Path,
        default=_ROOT / "backend" / "data" / "rice_data.csv",
    )
    ap.add_argument(
        "--mock-sentiment",
        action="store_true",
        help="Set RICE_SENTIMENT_MOCK=1",
    )
    args = ap.parse_args()
    if args.mock_sentiment:
        os.environ["RICE_SENTIMENT_MOCK"] = "1"

    if not args.csv.is_file():
        print(f"Missing {args.csv}", file=sys.stderr)
        sys.exit(1)

    df = pd.read_csv(args.csv)
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").reset_index(drop=True)
    nxt = df["avg_price"].shift(-1)
    y = (nxt - df["avg_price"]) / df["avg_price"] * 100.0
    mask = y.notna()
    df = df.loc[mask].copy()
    y = y.loc[mask]

    sent = [
        float(get_rice_market_sentiment(_headlines_cell(str(h))))
        for h in df["news_headline"]
    ]
    df["sentiment_score"] = sent
    for name in NEWS_FEATURE_NAMES:
        df[name] = [lexical_news_features(h)[name] for h in df["news_headline"]]

    cols = ["sentiment_score", *NEWS_FEATURE_NAMES]
    print("Pearson correlation with next-day % change (your CSV rows):")
    for c in cols:
        r = df[c].corr(y)
        print(f"  {c:18s}  r = {r:+.4f}")
    print("\nTip: regenerate training text with: python scripts/xlsx_to_market.py")


if __name__ == "__main__":
    main()
