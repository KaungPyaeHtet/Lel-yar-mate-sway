"""
End-to-end feature merge + XGBoost regressor for next-day **price change %**.

Combines:
  - Daily news sentiment (ClimateBERT-backed `get_rice_market_sentiment`)
  - Weather (rainfall_mm, temp_c) from your table
  - Historical price lags + TimesFM-style series features
"""

from __future__ import annotations

from typing import Sequence

import backend.native_env  # noqa: F401 — before NumPy (OpenMP)

import numpy as np
import pandas as pd
import xgboost as xgb

from .sentiment import get_rice_market_sentiment
from .timesfm_features import TimesFMFeatureExtractor, add_timesfm_features_to_frame

__all__ = [
    "build_supervised_frame",
    "build_supervised_frame_with_dates",
    "make_xgb_regressor",
    "make_xgb_regressor_for_backtest",
    "supervised_feature_columns",
    "build_inference_feature_matrix",
    "build_inference_features_and_meta",
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


def _headlines_cell(s: str) -> list[str]:
    parts = [x.strip() for x in s.replace(";", ".").split(".") if x.strip()]
    return parts if parts else ([s.strip()] if s.strip() else [])


def build_inference_features_and_meta(
    avg_prices: Sequence[float],
    rainfall_mm: float,
    temp_c: float,
    news_headline: str,
    rainfall_col: str = "rainfall_mm",
    temp_col: str = "temp_c",
) -> tuple[pd.DataFrame, dict[str, float | int]]:
    """
    Feature row for inference plus human-readable meta (lags %, sentiment, counts).
    """
    p = np.asarray(avg_prices, dtype=np.float64).ravel()
    if p.size < 8:
        raise ValueError("avg_prices must contain at least 8 values")

    hl = _headlines_cell(str(news_headline))
    ext = TimesFMFeatureExtractor()
    ts = ext.transform(p[:-1])
    pt, p1, p7 = float(p[-1]), float(p[-2]), float(p[-8])
    sent = float(get_rice_market_sentiment(hl))

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
    df = pd.DataFrame([row], columns=cols)
    meta: dict[str, float | int] = {
        "sentiment_score": sent,
        "price_change_1d_pct": (pt / p1 - 1.0) * 100.0,
        "price_change_7d_pct": (pt / p7 - 1.0) * 100.0,
        "temp_c": float(temp_c),
        "rainfall_mm": float(rainfall_mm),
        "news_snippet_count": len(hl),
    }
    return df, meta


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
    df, _ = build_inference_features_and_meta(
        avg_prices,
        rainfall_mm,
        temp_c,
        news_headline,
        rainfall_col,
        temp_col,
    )
    return df


def build_supervised_frame_with_dates(
    df: pd.DataFrame,
    price_col: str = "avg_price",
    date_col: str = "date",
    headline_col: str = "news_headline",
    rainfall_col: str = "rainfall_mm",
    temp_col: str = "temp_c",
) -> tuple[pd.DataFrame, pd.Series, pd.Series]:
    """
    Like build_supervised_frame but also returns observation dates (row = morning of
    that calendar day; target is % move to the following day).
    """
    d = df.copy()
    d[date_col] = pd.to_datetime(d[date_col])
    d = d.sort_values(date_col).reset_index(drop=True)

    d = add_timesfm_features_to_frame(d, price_col=price_col, date_col=date_col)

    d["price_lag1"] = d[price_col].shift(1)
    d["price_lag7"] = d[price_col].shift(7)
    d["price_lag1_rel"] = d[price_col] / d["price_lag1"] - 1.0
    d["price_lag7_rel"] = d[price_col] / d["price_lag7"] - 1.0

    def headlines_cell(cell) -> list[str]:
        s = str(cell) if cell is not None else ""
        parts = [p.strip() for p in s.replace(";", ".").split(".") if p.strip()]
        return parts if parts else ([s] if s else [])

    d["sentiment_score"] = [
        get_rice_market_sentiment(headlines_cell(h)) for h in d[headline_col]
    ]

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
    obs_dates = d[date_col].dt.normalize()
    return X, y, obs_dates


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
    X, y, _ = build_supervised_frame_with_dates(
        df,
        price_col=price_col,
        date_col=date_col,
        headline_col=headline_col,
        rainfall_col=rainfall_col,
        temp_col=temp_col,
    )
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


def make_xgb_regressor_for_backtest(n_train_rows: int, **kwargs) -> xgb.XGBRegressor:
    """
    Training-set size–aware regressor for time-series backtests.
    With very few rows, use shallower trees and stronger L2 to limit overfitting.
    """
    if n_train_rows < 25:
        params = dict(
            n_estimators=200,
            learning_rate=0.07,
            max_depth=3,
            min_child_weight=2,
            subsample=0.88,
            colsample_bytree=0.88,
            reg_lambda=2.0,
            reg_alpha=0.2,
            random_state=42,
            n_jobs=-1,
        )
    else:
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
