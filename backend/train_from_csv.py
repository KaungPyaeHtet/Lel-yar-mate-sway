#!/usr/bin/env python3
"""
Train XGBoost + HistGradientBoosting on rice_data.csv (date, avg_price, rainfall_mm,
temp_c, news_headline).

Uses ClimateBERT-backed sentiment, price lags (t-1, t-7 rel), weather, and
TimesFM-style series features. Target = next-day price change %.

Writes:
  - backend/models/rice_xgb.json — primary (XGBoost)
  - backend/models/rice_hgb.joblib — ensemble partner (sklearn HGB)
  - backend/models/training_report.json — metrics, blend weights, feature list

Examples:
  RICE_SENTIMENT_MOCK=1 python backend/train_from_csv.py --csv backend/data/rice_data.csv
  python backend/train_from_csv.py --csv rice_data.csv --no-hgb
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import backend.native_env  # noqa: F401 — before NumPy / OpenMP

import joblib
import pandas as pd
from sklearn.metrics import mean_absolute_error

from backend.pipeline import (
    build_supervised_frame,
    make_hgb_regressor,
    make_xgb_regressor,
)


def _blend_weights_from_maes(mae_x: float, mae_h: float) -> dict[str, float]:
    """Inverse-MAE weights (better model gets more weight)."""
    rx = max(float(mae_x), 1e-9)
    rh = max(float(mae_h), 1e-9)
    ix = 1.0 / rx
    ih = 1.0 / rh
    s = ix + ih
    return {"xgb": ix / s, "hgb": ih / s}


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
        "--save-hgb",
        type=Path,
        default=_ROOT / "backend" / "models" / "rice_hgb.joblib",
        help="Write sklearn HistGradientBoosting (joblib)",
    )
    ap.add_argument(
        "--save-report",
        type=Path,
        default=_ROOT / "backend" / "models" / "training_report.json",
        help="JSON with MAEs, blend weights, feature names",
    )
    ap.add_argument(
        "--no-save-model",
        action="store_true",
        help="Do not write model files",
    )
    ap.add_argument(
        "--no-hgb",
        action="store_true",
        help="Train only XGBoost (skip HGB ensemble file)",
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
    split = int(len(X) * (1 - args.test_size))
    X_train, X_test = X.iloc[:split], X.iloc[split:]
    y_train, y_test = y.iloc[:split], y.iloc[split:]

    model = make_xgb_regressor(random_state=args.seed)
    model.fit(X_train, y_train)
    pred_x = model.predict(X_test)
    mae_x = mean_absolute_error(y_test, pred_x)

    hgb = None
    pred_h = None
    mae_h = None
    mae_blend = None
    blend_weights: dict[str, float] = {"xgb": 1.0, "hgb": 0.0}

    if not args.no_hgb:
        if len(X_train) < 25:
            hgb = make_hgb_regressor(
                random_state=args.seed,
                max_depth=4,
                max_iter=250,
                min_samples_leaf=3,
            )
        else:
            hgb = make_hgb_regressor(random_state=args.seed)
        hgb.fit(X_train, y_train)
        pred_h = hgb.predict(X_test)
        mae_h = mean_absolute_error(y_test, pred_h)
        blend_weights = _blend_weights_from_maes(mae_x, mae_h)
        blend_pred = (
            blend_weights["xgb"] * pred_x + blend_weights["hgb"] * pred_h
        )
        mae_blend = mean_absolute_error(y_test, blend_pred)

    if not args.no_save_model:
        args.save_model.parent.mkdir(parents=True, exist_ok=True)
        model.save_model(str(args.save_model))
        print(f"Saved model to {args.save_model}")
        if hgb is not None:
            joblib.dump(hgb, args.save_hgb)
            print(f"Saved ensemble model to {args.save_hgb}")

    try:
        csv_display = str(args.csv.relative_to(_ROOT))
    except ValueError:
        csv_display = str(args.csv)
    report = {
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "csv": csv_display,
        "n_supervised_rows": int(len(X)),
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
        "test_size": args.test_size,
        "metrics": {
            "test_mae_xgb_pct": round(mae_x, 6),
            **(
                {
                    "test_mae_hgb_pct": round(mae_h, 6),
                    "test_mae_blend_pct": round(mae_blend, 6),
                }
                if mae_h is not None and mae_blend is not None
                else {}
            ),
        },
        "blend_weights": blend_weights,
        "ensemble": "xgb+hgb" if hgb is not None else "xgb_only",
        "feature_names": list(X.columns),
    }
    if not args.no_save_model:
        args.save_report.parent.mkdir(parents=True, exist_ok=True)
        args.save_report.write_text(
            json.dumps(report, indent=2) + "\n", encoding="utf-8"
        )
        print(f"Wrote report to {args.save_report}")

    print(f"Test MAE XGB (next-day % change): {mae_x:.4f}")
    if mae_h is not None and mae_blend is not None:
        print(f"Test MAE HGB: {mae_h:.4f}")
        print(f"Test MAE blend: {mae_blend:.4f}  (weights xgb={blend_weights['xgb']:.3f} hgb={blend_weights['hgb']:.3f})")
    print("Feature importances XGB (gain):")
    for name, imp in sorted(
        zip(X.columns, model.feature_importances_), key=lambda x: -x[1]
    )[:12]:
        print(f"  {name}: {imp:.4f}")


if __name__ == "__main__":
    main()
