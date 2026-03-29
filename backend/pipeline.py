"""
End-to-end feature merge + XGBoost regressor for next-day **price change %**.

Combines:
  - Daily news sentiment (ClimateBERT-backed `get_rice_market_sentiment`)
  - Weather (rainfall_mm, temp_c) from your table
  - Historical price lags + TimesFM-style series features
"""

from __future__ import annotations

from typing import Sequence

import numpy as np
import pandas as pd
import xgboost as xgb

from .sentiment import get_rice_market_sentiment
from .timesfm_features import TimesFMFeatureExtractor, add_timesfm_features_to_frame

__all__ = [
    "build_supervised_frame",
    "make_xgb_regressor",
    "supervised_feature_columns",
    "build_inference_feature_matrix",
]


def supervised_feature_columns(
    rainfall_col: str = "rainfall_mm",
    temp_col: str = "temp_c",
) -> list[str]:
    return [
        "price_lag1_rel",
        "price_lag7_rel",
        rainfall_col,
        temp_col,
        "sentiment_score",
        *TimesFMFeatureExtractor.feature_names(),
    ]


def build_inference_feature_matrix(
    avg_prices: Sequence[float],
    rainfall_mm: float,
    temp_c: float,
    news_headline: str,
    rainfall_col: str = "rainfall_mm",
    temp_col: str = "temp_c",
) -> pd.DataFrame:
    """
    One row matching training features for “today” (last price = avg_prices[-1]).
    Requires ≥8 daily prices (oldest → newest). TimesFM block uses prices[:-1].
    """
    p = np.asarray(avg_prices, dtype=np.float64).ravel()
    if p.size < 8:
        raise ValueError("avg_prices must contain at least 8 values")

    def headlines_cell(s: str) -> list[str]:
        parts = [x.strip() for x in s.replace(";", ".").split(".") if x.strip()]
        return parts if parts else ([s.strip()] if s.strip() else [])

    ext = TimesFMFeatureExtractor()
    ts = ext.transform(p[:-1])
    pt, p1, p7 = float(p[-1]), float(p[-2]), float(p[-8])
    sent = float(get_rice_market_sentiment(headlines_cell(str(news_headline))))

    row = {
        "price_lag1_rel": pt / p1 - 1.0,
        "price_lag7_rel": pt / p7 - 1.0,
        rainfall_col: float(rainfall_mm),
        temp_col: float(temp_c),
        "sentiment_score": sent,
    }
    for name, val in zip(TimesFMFeatureExtractor.feature_names(), ts):
        row[name] = float(val)

    cols = supervised_feature_columns(rainfall_col, temp_col)
    return pd.DataFrame([row], columns=cols)


def build_supervised_frame(
    df: pd.DataFrame,
    price_col: str = "avg_price",
    date_col: str = "date",
    headline_col: str = "news_headline",
    rainfall_col: str = "rainfall_mm",
    temp_col: str = "temp_c",
) -> tuple[pd.DataFrame, pd.Series]:
    """
    Returns X_frame (features per day) and y (next-day % price change), aligned by index.
    Drops rows without a next day or insufficient history.
    """
    d = df.copy()
    d[date_col] = pd.to_datetime(d[date_col])
    d = d.sort_values(date_col).reset_index(drop=True)

    d = add_timesfm_features_to_frame(d, price_col=price_col, date_col=date_col)

    # Price lags (same calendar row = info available that morning)
    d["price_lag1"] = d[price_col].shift(1)
    d["price_lag7"] = d[price_col].shift(7)
    d["price_lag1_rel"] = d[price_col] / d["price_lag1"] - 1.0
    d["price_lag7_rel"] = d[price_col] / d["price_lag7"] - 1.0

    # Sentiment from headline(s) — one string per row; split bullets if present
    def headlines_cell(cell) -> list[str]:
        s = str(cell) if cell is not None else ""
        parts = [p.strip() for p in s.replace(";", ".").split(".") if p.strip()]
        return parts if parts else ([s] if s else [])

    d["sentiment_score"] = [
        get_rice_market_sentiment(headlines_cell(h)) for h in d[headline_col]
    ]

    # Target: next-day % change (supervised label for row t predicts t+1 move from t)
    nxt = d[price_col].shift(-1)
    d["target_pct_change"] = (nxt - d[price_col]) / d[price_col] * 100.0

    feat_names = supervised_feature_columns(rainfall_col, temp_col)

    mask = (
        d["price_lag7"].notna()
        & d["target_pct_change"].notna()
        & d[rainfall_col].notna()
        & d[temp_col].notna()
    )
    d = d.loc[mask].reset_index(drop=True)

    X = d[feat_names].astype(np.float64)
    y = d["target_pct_change"].astype(np.float64)
    return X, y


def make_xgb_regressor(**kwargs) -> xgb.XGBRegressor:
    """XGBoost regressor; optimize MAE on holdout via default squared loss + eval."""
    params = dict(
        n_estimators=400,
        learning_rate=0.05,
        max_depth=5,
        subsample=0.85,
        colsample_bytree=0.85,
        random_state=42,
        n_jobs=-1,
    )
    params.update(kwargs)
    return xgb.XGBRegressor(**params)
