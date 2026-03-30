"""
End-to-end feature merge + XGBoost regressor for next-day **price change %**.

Combines:
  - News: sentiment + lexical features on a **rolling ~30-day** headline window (training)
    or the last 30 headline slices / synthesized window (inference).
  - Weather: **rolling 30-day** rain/temp statistics (mean, sum, std of temp) plus series
    used only for building those stats; raw daily columns stay in CSV for rolling.
  - Historical price lags + TimesFM-style series features
"""

from __future__ import annotations

import re
from typing import Sequence, Union

import backend.native_env  # noqa: F401 — before NumPy (OpenMP)

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.ensemble import HistGradientBoostingRegressor

from .news_features import NEWS_FEATURE_NAMES, lexical_news_features
from .sentiment import get_rice_market_sentiment
from .timesfm_features import TimesFMFeatureExtractor, add_timesfm_features_to_frame

ROLLING_DAYS = 30
ROLLING_NEWS_MAX_CHARS = 12000

__all__ = [
    "build_supervised_frame",
    "build_supervised_frame_with_dates",
    "make_xgb_regressor",
    "make_xgb_regressor_full_features",
    "xgb_feature_weights_for_column_sampling",
    "make_hgb_regressor",
    "make_xgb_regressor_for_backtest",
    "supervised_feature_columns",
    "channel_column_groups",
    "build_inference_feature_matrix",
    "build_inference_features_and_meta",
    "ROLLING_DAYS",
]


def channel_column_groups() -> tuple[list[str], list[str], list[str]]:
    """
    Feature groups for separate XGB heads blended at inference (default 60% / 30% / 10%):
    - price: lags + TimesFM-style series stats (history / trend)
    - news: sentiment + lexical nf_* filters
    - weather: 30-day rolling rain/temp aggregates
    """
    ts = TimesFMFeatureExtractor.feature_names()
    price = ["price_lag1_rel", "price_lag7_rel", *ts]
    news = ["sentiment_score", *NEWS_FEATURE_NAMES]
    weather = [
        "rain_mm_mean_30d",
        "rain_mm_sum_30d",
        "temp_mean_30d",
        "temp_std_30d",
    ]
    return price, news, weather


def supervised_feature_columns() -> list[str]:
    return [
        "price_lag1_rel",
        "price_lag7_rel",
        "rain_mm_mean_30d",
        "rain_mm_sum_30d",
        "temp_mean_30d",
        "temp_std_30d",
        "sentiment_score",
        *NEWS_FEATURE_NAMES,
        *TimesFMFeatureExtractor.feature_names(),
    ]


def _headlines_cell(s: str) -> list[str]:
    parts = [x.strip() for x in s.replace(";", ".").split(".") if x.strip()]
    return parts if parts else ([s.strip()] if s.strip() else [])


def _rolling_news_window_text(series: pd.Series, window: int = ROLLING_DAYS) -> list[str]:
    texts = series.astype(str).tolist()
    out: list[str] = []
    for i in range(len(texts)):
        start = max(0, i - window + 1)
        chunk = ". ".join(texts[start : i + 1])
        if len(chunk) > ROLLING_NEWS_MAX_CHARS:
            chunk = chunk[-ROLLING_NEWS_MAX_CHARS :]
        out.append(chunk)
    return out


def _weather_window_from_inputs(
    rainfall_mm: Union[float, Sequence[float]],
    temp_c: Union[float, Sequence[float]],
) -> tuple[float, float, float, float, float, float]:
    """
    Returns (rain_mean, rain_sum, t_mean, t_std, rain_last, temp_last) from up to 30 days.
    Scalars are replicated (degraded — no history).
    """

    def seq(x: Union[float, Sequence[float]], default: float) -> list[float]:
        if isinstance(x, (int, float)) and not isinstance(x, bool):
            v = float(x)
            return [v] * ROLLING_DAYS
        xs = [float(t) for t in x]
        if len(xs) == 0:
            return [default] * ROLLING_DAYS
        if len(xs) < ROLLING_DAYS:
            pad = [xs[0]] * (ROLLING_DAYS - len(xs)) + xs
            return pad[-ROLLING_DAYS :]
        return xs[-ROLLING_DAYS :]

    r = np.array(seq(rainfall_mm, 0.0), dtype=np.float64)
    t = np.array(seq(temp_c, 28.0), dtype=np.float64)
    return (
        float(np.mean(r)),
        float(np.sum(r)),
        float(np.mean(t)),
        float(np.std(t)) if t.size > 1 else 0.0,
        float(r[-1]),
        float(t[-1]),
    )


def _news_window_from_inputs(
    news_headline: Union[str, Sequence[str]],
) -> str:
    """Build one long text for sentiment + lexical features (aligned with training)."""
    if isinstance(news_headline, (list, tuple)):
        parts = [str(x).strip() for x in news_headline if str(x).strip()]
        if not parts:
            return "Commodity markets."
        text = ". ".join(parts[-ROLLING_DAYS:])
        return text[-ROLLING_NEWS_MAX_CHARS:]

    s = str(news_headline).strip() or "Commodity markets."
    sentences = [x.strip() for x in re.split(r"(?<=[.!?])\s+", s) if x.strip()]
    if len(sentences) <= 1:
        return s[:ROLLING_NEWS_MAX_CHARS]
    n = min(ROLLING_DAYS, len(sentences))
    per = max(1, len(sentences) // n)
    chunks: list[str] = []
    for i in range(n):
        lo = i * per
        hi = min((i + 1) * per, len(sentences))
        chunks.append(" ".join(sentences[lo:hi]))
    while len(chunks) < ROLLING_DAYS:
        chunks.append(chunks[-1])
    text = ". ".join(chunks[:ROLLING_DAYS])
    return text[-ROLLING_NEWS_MAX_CHARS:]


def build_inference_features_and_meta(
    avg_prices: Sequence[float],
    rainfall_mm: Union[float, Sequence[float]],
    temp_c: Union[float, Sequence[float]],
    news_headline: Union[str, Sequence[str]],
) -> tuple[pd.DataFrame, dict[str, float | int]]:
    """
    Feature row for inference plus human-readable meta (lags %, sentiment, counts).
    Pass **30-day** sequences for rain/temp when available; else scalars are repeated.
    Pass **news_headlines_history** as a list of up to ~30 strings, or one combined string
    (split into pseudo-daily chunks).
    """
    p = np.asarray(avg_prices, dtype=np.float64).ravel()
    if p.size < 8:
        raise ValueError("avg_prices must contain at least 8 values")

    news_w = _news_window_from_inputs(news_headline)
    hl = _headlines_cell(news_w)
    ext = TimesFMFeatureExtractor()
    ts = ext.transform(p[:-1])
    pt, p1, p7 = float(p[-1]), float(p[-2]), float(p[-8])
    sent = float(get_rice_market_sentiment(hl))
    nf = lexical_news_features(news_w)
    rm, rs, tm, tsd, rlast, tlast = _weather_window_from_inputs(rainfall_mm, temp_c)

    row = {
        "price_lag1_rel": pt / p1 - 1.0,
        "price_lag7_rel": pt / p7 - 1.0,
        "rain_mm_mean_30d": rm,
        "rain_mm_sum_30d": rs,
        "temp_mean_30d": tm,
        "temp_std_30d": tsd,
        "sentiment_score": sent,
        **nf,
    }
    for name, val in zip(TimesFMFeatureExtractor.feature_names(), ts):
        row[name] = float(val)

    cols = supervised_feature_columns()
    df = pd.DataFrame([row], columns=cols)
    meta: dict[str, float | int] = {
        "sentiment_score": sent,
        "price_change_1d_pct": (pt / p1 - 1.0) * 100.0,
        "price_change_7d_pct": (pt / p7 - 1.0) * 100.0,
        "temp_c": tlast,
        "rainfall_mm": rlast,
        "news_snippet_count": len(hl),
    }
    return df, meta


def build_inference_feature_matrix(
    avg_prices: Sequence[float],
    rainfall_mm: Union[float, Sequence[float]],
    temp_c: Union[float, Sequence[float]],
    news_headline: Union[str, Sequence[str]],
) -> pd.DataFrame:
    df, _ = build_inference_features_and_meta(
        avg_prices,
        rainfall_mm,
        temp_c,
        news_headline,
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

    d["rain_mm_mean_30d"] = (
        d[rainfall_col].rolling(window=ROLLING_DAYS, min_periods=1).mean()
    )
    d["rain_mm_sum_30d"] = (
        d[rainfall_col].rolling(window=ROLLING_DAYS, min_periods=1).sum()
    )
    d["temp_mean_30d"] = (
        d[temp_col].rolling(window=ROLLING_DAYS, min_periods=1).mean()
    )
    d["temp_std_30d"] = (
        d[temp_col].rolling(window=ROLLING_DAYS, min_periods=1).std().fillna(0.0)
    )

    d["news_30d"] = _rolling_news_window_text(d[headline_col], ROLLING_DAYS)

    def headlines_cell(cell) -> list[str]:
        s = str(cell) if cell is not None else ""
        parts = [p.strip() for p in s.replace(";", ".").split(".") if p.strip()]
        return parts if parts else ([s] if s else [])

    d["sentiment_score"] = [
        get_rice_market_sentiment(headlines_cell(h)) for h in d["news_30d"]
    ]
    _nf = [lexical_news_features(h) for h in d["news_30d"]]
    for name in NEWS_FEATURE_NAMES:
        d[name] = [r[name] for r in _nf]

    nxt = d[price_col].shift(-1)
    d["target_pct_change"] = (nxt - d[price_col]) / d[price_col] * 100.0

    feat_names = supervised_feature_columns()

    mask = (
        d["price_lag7"].notna()
        & d["target_pct_change"].notna()
        & d[rainfall_col].notna()
        & d[temp_col].notna()
        & d["rain_mm_mean_30d"].notna()
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
    """XGBoost regressor (default hyperparameters for channel heads or small feature sets)."""
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


def make_xgb_regressor_full_features(**kwargs) -> xgb.XGBRegressor:
    """
    XGBoost on the **full** feature matrix (price + weather + news + series).

    Slightly lower **colsample_bytree** than `make_xgb_regressor` so more trees consider
    sentiment / weather / lexical columns; **gamma stays 0** (tiny ``gamma`` collapses
    trees to single leaves on small training sets). MAE should stay within ~10% of the
    baseline full model. Inference still uses **60/30/10 channel blend** — see channel
    importances in the training log for news/weather-specific heads.
    """
    params = dict(
        n_estimators=400,
        learning_rate=0.05,
        max_depth=5,
        subsample=0.85,
        colsample_bytree=0.72,
        colsample_bylevel=0.9,
        reg_lambda=1.0,
        gamma=0,
        random_state=42,
        n_jobs=-1,
    )
    params.update(kwargs)
    return xgb.XGBRegressor(**params)


def xgb_feature_weights_for_column_sampling(columns: Sequence[str]) -> np.ndarray:
    """
    Optional weights for XGBoost column subsampling: slightly **lower** on dominant price
    lags so other columns are sampled a bit more often. Set env ``RICE_XGB_FEATURE_WEIGHTS=1``
    in ``train_from_csv`` to apply (can slightly change MAE).
    """
    ts = set(TimesFMFeatureExtractor.feature_names())
    w = np.ones(len(columns), dtype=np.float64)
    for i, c in enumerate(columns):
        if c in ("price_lag1_rel", "price_lag7_rel"):
            w[i] = 0.52
        elif c in ts:
            w[i] = 0.75
    return w


def make_hgb_regressor(**kwargs) -> HistGradientBoostingRegressor:
    """Sklearn HGB regressor — second opinion for ensemble with XGBoost (same features)."""
    params = dict(
        max_iter=400,
        learning_rate=0.06,
        max_depth=6,
        min_samples_leaf=2,
        l2_regularization=0.1,
        random_state=42,
    )
    params.update(kwargs)
    return HistGradientBoostingRegressor(**params)


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
