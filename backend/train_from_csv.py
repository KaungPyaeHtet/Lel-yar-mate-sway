#!/usr/bin/env python3
"""
Train XGBoost on rice_data.csv (date, avg_price, rainfall_mm, temp_c, news_headline).

Uses ClimateBERT-backed sentiment, price lags (t-1, t-7 rel), weather, and
TimesFM-style series features. Target = next-day price change %.

Examples:
  RICE_SENTIMENT_MOCK=1 python backend/train_from_csv.py --csv backend/data/rice_data.csv
  python backend/train_from_csv.py --csv rice_data.csv
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import backend.native_env  # noqa: F401 — before NumPy / OpenMP

import pandas as pd
from sklearn.metrics import mean_absolute_error
from backend.pipeline import build_supervised_frame, make_xgb_regressor


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--csv",
        type=Path,
        default=_ROOT / "backend" / "data" / "rice_data.csv",
        help="Path to rice_data.csv",
    )
    ap.add_argument("--test-size", type=float, default=0.2)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument(
        "--mock-sentiment",
        action="store_true",
        help="Set RICE_SENTIMENT_MOCK=1 (no transformers download)",
    )
    ap.add_argument(
        "--save-model",
        type=Path,
        default=_ROOT / "backend" / "models" / "rice_xgb.json",
        help="Write trained XGBoost JSON (for FastAPI server)",
    )
    ap.add_argument(
        "--no-save-model",
        action="store_true",
        help="Do not write model file",
    )
    args = ap.parse_args()

    if args.mock_sentiment:
        os.environ["RICE_SENTIMENT_MOCK"] = "1"

    if not args.csv.is_file():
        print(f"CSV not found: {args.csv}", file=sys.stderr)
        print("Run: python backend/mock_data.py", file=sys.stderr)
        sys.exit(1)

    df = pd.read_csv(args.csv)
    required = {"date", "avg_price", "rainfall_mm", "temp_c", "news_headline"}
    missing = required - set(df.columns)
    if missing:
        print(f"Missing columns: {missing}", file=sys.stderr)
        sys.exit(1)

    X, y = build_supervised_frame(df)
    # Time-aware split: last chunk as test
    split = int(len(X) * (1 - args.test_size))
    X_train, X_test = X.iloc[:split], X.iloc[split:]
    y_train, y_test = y.iloc[:split], y.iloc[split:]

    model = make_xgb_regressor(random_state=args.seed)
    model.fit(X_train, y_train)
    if not args.no_save_model:
        args.save_model.parent.mkdir(parents=True, exist_ok=True)
        model.save_model(str(args.save_model))
        print(f"Saved model to {args.save_model}")
    pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, pred)
    print(f"Test MAE (next-day % change): {mae:.4f}")
    print("Feature importances (gain):")
    for name, imp in sorted(
        zip(X.columns, model.feature_importances_), key=lambda x: -x[1]
    )[:12]:
        print(f"  {name}: {imp:.4f}")


if __name__ == "__main__":
    main()
