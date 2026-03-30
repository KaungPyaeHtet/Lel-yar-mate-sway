"""
Shared training logic for next-day % XGBoost models (channel heads + optional full ensemble).

Used by ``train_from_csv.py`` (global default series) and ``train_per_item.py`` (one bundle per
``market_item_id`` directory under ``backend/models/by_item/<id>/``).
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import mean_absolute_error

from backend.pipeline import (
    build_supervised_frame,
    channel_column_groups,
    make_hgb_regressor,
    make_xgb_regressor,
    make_xgb_regressor_full_features,
    xgb_feature_weights_for_column_sampling,
)


def _blend_weights_from_maes(mae_x: float, mae_h: float) -> dict[str, float]:
    rx = max(float(mae_x), 1e-9)
    rh = max(float(mae_h), 1e-9)
    ix = 1.0 / rx
    ih = 1.0 / rh
    s = ix + ih
    return {"xgb": ix / s, "hgb": ih / s}


def train_models_for_frame(
    df: pd.DataFrame,
    out_dir: Path,
    *,
    csv_display: str,
    test_size: float = 0.2,
    seed: int = 42,
    save: bool = True,
    channel_only: bool = False,
    no_hgb: bool = False,
    xgb_feature_weights: bool = False,
    full_xgb_path: Path | None = None,
    hgb_path: Path | None = None,
    report_path: Path | None = None,
) -> tuple[dict[str, Any], xgb.XGBRegressor | None]:
    """
    Train on a supervised frame from ``build_supervised_frame``-compatible CSV.

    If ``channel_only`` is True, only the 60/30/10 channel XGB heads and ``training_report.json``
    are written (fast path for per-item bundles). Otherwise also trains full XGB + optional HGB
    like ``train_from_csv.py``.
    """
    if xgb_feature_weights:
        os.environ["RICE_XGB_FEATURE_WEIGHTS"] = "1"

    X, y = build_supervised_frame(df)
    if len(X) < 8:
        raise ValueError(
            f"Need at least 8 supervised rows after feature build; got {len(X)}"
        )

    split = int(len(X) * (1 - test_size))
    split = max(1, min(split, len(X) - 1))
    X_train, X_test = X.iloc[:split], X.iloc[split:]
    y_train, y_test = y.iloc[:split], y.iloc[split:]

    out_dir = Path(out_dir)
    price_cols, news_cols, weather_cols = channel_column_groups()
    channel_paths = {
        "price": out_dir / "rice_xgb_price.json",
        "news": out_dir / "rice_xgb_news.json",
        "weather": out_dir / "rice_xgb_weather.json",
    }
    channel_blend = {"price": 0.6, "news": 0.3, "weather": 0.1}
    channel_maes: dict[str, float] = {}
    preds_ch: dict[str, np.ndarray] = {}

    for key, cols in (
        ("price", price_cols),
        ("news", news_cols),
        ("weather", weather_cols),
    ):
        m_ch = make_xgb_regressor(
            random_state=seed,
            colsample_bytree=0.95,
            max_depth=6 if key != "weather" else 5,
        )
        m_ch.fit(X_train[cols], y_train)
        preds_ch[key] = m_ch.predict(X_test[cols])
        channel_maes[key] = float(mean_absolute_error(y_test, preds_ch[key]))
        if save:
            out_dir.mkdir(parents=True, exist_ok=True)
            m_ch.save_model(str(channel_paths[key]))

    wp, wn, ww = channel_blend["price"], channel_blend["news"], channel_blend["weather"]
    pred_channel_blend = wp * preds_ch["price"] + wn * preds_ch["news"] + ww * preds_ch["weather"]
    mae_channel_blend = float(mean_absolute_error(y_test, pred_channel_blend))

    model = None
    pred_x = None
    mae_x: float | None = None
    hgb = None
    pred_h = None
    mae_h: float | None = None
    mae_blend: float | None = None
    blend_weights: dict[str, float] = {"xgb": 1.0, "hgb": 0.0}

    save_model_path = full_xgb_path or (out_dir / "rice_xgb.json")
    save_hgb_path = hgb_path or (out_dir / "rice_hgb.joblib")
    report_out = report_path or (out_dir / "training_report.json")

    if not channel_only:
        model = make_xgb_regressor_full_features(random_state=seed)
        if os.environ.get("RICE_XGB_FEATURE_WEIGHTS") == "1":
            fw = xgb_feature_weights_for_column_sampling(list(X_train.columns))
            model.set_params(feature_weights=fw)
        model.fit(X_train, y_train)
        pred_x = model.predict(X_test)
        mae_x = float(mean_absolute_error(y_test, pred_x))

        if not no_hgb:
            if len(X_train) < 25:
                hgb = make_hgb_regressor(
                    random_state=seed,
                    max_depth=4,
                    max_iter=250,
                    min_samples_leaf=3,
                )
            else:
                hgb = make_hgb_regressor(random_state=seed)
            hgb.fit(X_train, y_train)
            pred_h = hgb.predict(X_test)
            mae_h = float(mean_absolute_error(y_test, pred_h))
            blend_weights = _blend_weights_from_maes(mae_x, mae_h)
            blend_pred = blend_weights["xgb"] * pred_x + blend_weights["hgb"] * pred_h
            mae_blend = float(mean_absolute_error(y_test, blend_pred))

        if save:
            out_dir.mkdir(parents=True, exist_ok=True)
            save_model_path.parent.mkdir(parents=True, exist_ok=True)
            model.save_model(str(save_model_path))
            if hgb is not None:
                save_hgb_path.parent.mkdir(parents=True, exist_ok=True)
                joblib.dump(hgb, save_hgb_path)

    def _rel(p: Path) -> str:
        try:
            root = Path(__file__).resolve().parents[1]
            return str(p.relative_to(root))
        except ValueError:
            return str(p)

    metrics: dict[str, Any] = {
        "test_mae_channel_blend_pct": round(mae_channel_blend, 6),
    }
    if mae_x is not None:
        metrics["test_mae_xgb_pct"] = round(mae_x, 6)
    if mae_h is not None and mae_blend is not None:
        metrics["test_mae_hgb_pct"] = round(mae_h, 6)
        metrics["test_mae_blend_pct"] = round(mae_blend, 6)

    report: dict[str, Any] = {
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "csv": csv_display,
        "channel_only": channel_only,
        "n_supervised_rows": int(len(X)),
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
        "test_size": test_size,
        "metrics": metrics,
        "blend_weights": blend_weights,
        "ensemble": (
            "xgb+hgb"
            if not channel_only and hgb is not None
            else ("channel_only" if channel_only else "xgb_only")
        ),
        "feature_names": list(X.columns),
        "channel_blend": channel_blend,
        "channel_mae_test": {k: round(v, 6) for k, v in channel_maes.items()},
        "channel_blend_mae_test": round(mae_channel_blend, 6),
        "use_channel_blend": True,
        "channel_model_files": {k: _rel(v) for k, v in channel_paths.items()},
    }
    if not channel_only and save:
        report["full_model_file"] = _rel(save_model_path)
        if hgb is not None:
            report["hgb_model_file"] = _rel(save_hgb_path)

    if save:
        out_dir.mkdir(parents=True, exist_ok=True)
        report_out.parent.mkdir(parents=True, exist_ok=True)
        report_out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    return report, model if not channel_only else None
