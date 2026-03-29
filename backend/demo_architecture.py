#!/usr/bin/env python3
"""
Hackathon architecture demo: mock daily rows → merged features → XGBoost.

- Sentiment: ClimateBERT `distilroberta-base-climate-f` (or RICE_SENTIMENT_MOCK=1).
- Series: TimesFM if `timesfm` installed, else statistical features.
- Model: XGBoostRegressor on next-day price change %.

Run from repo root:
  RICE_SENTIMENT_MOCK=1 python backend/demo_architecture.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
from sklearn.metrics import mean_absolute_error

from backend.mock_data import make_mock_rice_frame
from backend.pipeline import build_supervised_frame, make_xgb_regressor
from backend.sentiment import get_rice_market_sentiment
from backend.timesfm_features import TimesFMFeatureExtractor


def main() -> None:
    if not os.environ.get("RICE_SENTIMENT_MOCK"):
        print(
            "Tip: export RICE_SENTIMENT_MOCK=1 for a fast run without downloading models.\n"
        )

    df = make_mock_rice_frame(n_days=100, seed=7)
    print("Mock frame:", df.shape, "columns:", list(df.columns))

    # Single-call sentiment demo (prompt 2)
    sample = [
        "Severe drought threatens paddy fields before monsoon recovery.",
        "Export ban announced on key grades; wholesale rice jumps.",
    ]
    print("Sample sentiment aggregate:", get_rice_market_sentiment(sample))

    ext = TimesFMFeatureExtractor()
    v = ext.transform(df["avg_price"].values[:30].astype(float))
    print("TimesFM-style feature dim:", v.shape, ext.feature_names())

    X, y = build_supervised_frame(df)
    print("Supervised X shape:", X.shape, "y shape:", y.shape)

    split = int(len(X) * 0.75)
    X_train, X_test = X.iloc[:split], X.iloc[split:]
    y_train, y_test = y.iloc[:split], y.iloc[split:]
    reg = make_xgb_regressor(n_estimators=200)
    reg.fit(X_train, y_train)
    mae = mean_absolute_error(y_test, reg.predict(X_test))
    print("Holdout MAE (price change %):", round(mae, 4))


if __name__ == "__main__":
    main()
