"""
Time-series features from historical prices.

Tries Google TimesFM (`google/timesfm-1.0-200m`) when `timesfm` is installed;
otherwise uses lightweight statistics (trend, momentum, level) so pipelines
run on laptops without the full checkpoint.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# Avoid repeating the same TimesFM import warning on every extractor instance.
_TIMESFM_FALLBACK_LOGGED = False


@dataclass
class SeriesFeatureConfig:
    context_len: int = 128
    horizon_len: int = 1


class TimesFMFeatureExtractor:
    """
    Produces a small feature vector from a 1D price history ending at day t.

    Attributes returned (always same dim for XGBoost):
        - timesfm_fcst_next (or statistical forecast)
        - fcst_minus_last (normalized residual vs last price)
        - log_vol_7 (log std of returns over last 7 obs)
        - mom_7 (t / t-7 - 1)
        - slope_14 (OLS slope over last min(14, len) points, normalized)
    """

    def __init__(self, config: Optional[SeriesFeatureConfig] = None):
        self.config = config or SeriesFeatureConfig()
        self._tfm = None
        self._try_load_timesfm()

    def _try_load_timesfm(self) -> None:
        global _TIMESFM_FALLBACK_LOGGED
        try:
            import timesfm  # type: ignore

            tfm = timesfm.TimesFm(
                context_len=self.config.context_len,
                horizon_len=self.config.horizon_len,
                input_patch_len=32,
                output_patch_len=128,
                num_layers=20,
                model_dims=1280,
                backend="cpu",
            )
            tfm.load_from_checkpoint(repo_id="google/timesfm-1.0-200m")
            self._tfm = tfm
            logger.info("TimesFM loaded from google/timesfm-1.0-200m")
        except Exception as e:  # noqa: BLE001
            self._tfm = None
            if not _TIMESFM_FALLBACK_LOGGED:
                _TIMESFM_FALLBACK_LOGGED = True
                logger.debug("TimesFM optional import failed: %s", e, exc_info=False)
                logger.info(
                    "Using built-in statistical series features for XGBoost "
                    "(optional: pip install timesfm per backend/requirements.txt)."
                )

    def transform(self, prices: np.ndarray) -> np.ndarray:
        """
        :param prices: 1D array of past prices (oldest → newest), length >= 2
        :returns: shape (5,) feature vector
        """
        p = np.asarray(prices, dtype=np.float64).ravel()
        if p.size < 2:
            return np.zeros(5, dtype=np.float64)

        last = float(p[-1])
        if last <= 0:
            last = 1e-6

        if self._tfm is not None:
            try:
                ctx = p[-self.config.context_len :]
                if ctx.size < 32:
                    ctx = np.pad(ctx, (32 - ctx.size, 0), mode="edge")
                # frequency 1 = medium per TimesFM docs for daily-ish data
                fcst, _ = self._tfm.forecast([ctx], freq=[1])
                fcst_next = float(np.asarray(fcst[0]).ravel()[0])
            except Exception as e:  # noqa: BLE001
                logger.debug("TimesFM forecast failed: %s", e)
                fcst_next = float(self._stat_forecast(p))
        else:
            fcst_next = float(self._stat_forecast(p))

        mom_7 = float(p[-1] / max(p[-7], 1e-6) - 1.0) if p.size >= 7 else 0.0
        tail = p[-8:]
        ret7 = (
            np.diff(np.log(np.maximum(tail, 1e-6)))
            if p.size >= 8
            else np.array([0.0])
        )
        log_vol_7 = float(np.log(np.std(ret7) + 1e-9))

        win = min(14, p.size)
        x = np.arange(win, dtype=np.float64)
        y = p[-win:]
        slope = float(np.polyfit(x, y, 1)[0]) if win >= 2 else 0.0
        slope_norm = slope / (np.mean(np.abs(y)) + 1e-6)

        fcst_res = (fcst_next - last) / last

        return np.array(
            [fcst_next, fcst_res, log_vol_7, mom_7, slope_norm],
            dtype=np.float64,
        )

    @staticmethod
    def _stat_forecast(p: np.ndarray) -> float:
        """Simple damped trend extrapolation (mock-friendly)."""
        if p.size < 3:
            return float(p[-1])
        recent = p[-7:] if p.size >= 7 else p
        t = np.arange(len(recent), dtype=np.float64)
        a, b = np.polyfit(t, recent, 1)
        nxt = a * (len(recent)) + b
        blend = 0.65 * nxt + 0.35 * float(p[-1])
        return float(blend)

    @staticmethod
    def feature_names() -> list[str]:
        return [
            "timesfm_or_stat_fcst",
            "fcst_minus_last_rel",
            "log_vol_7",
            "mom_7",
            "slope_14_norm",
        ]


def add_timesfm_features_to_frame(
    df: pd.DataFrame,
    price_col: str = "avg_price",
    date_col: str = "date",
) -> pd.DataFrame:
    """
    For each row, use all *prior* prices (by date) to compute series features.
    """
    out = df.copy()
    out[date_col] = pd.to_datetime(out[date_col])
    out = out.sort_values(date_col).reset_index(drop=True)
    extractor = TimesFMFeatureExtractor()
    names = extractor.feature_names()
    feat_matrix = np.zeros((len(out), len(names)), dtype=np.float64)

    prices_so_far: list[float] = []
    for i, row in out.iterrows():
        if prices_so_far:
            feat_matrix[i] = extractor.transform(np.array(prices_so_far))
        prices_so_far.append(float(row[price_col]))

    for j, n in enumerate(names):
        out[n] = feat_matrix[:, j]
    return out
