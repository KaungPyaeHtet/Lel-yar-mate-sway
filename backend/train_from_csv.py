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

Hugging Face (news channel): omit --mock-sentiment and ensure PyTorch + transformers
are installed so `backend/sentiment.py` runs ClimateBERT (`climatebert/distilroberta-base-climate-f`)
on each row’s rolling 30-day headline text. That score feeds `sentiment_score` and trains
with weather rolling features (rain/temp aggregates) and price lags — same path as inference.

Interpreting importances: the **full** model’s next-day target is mostly explained by price
momentum; **channel** rows (news-only / weather-only XGB heads) show how lexical + sentiment
and rolling weather columns are used. The API blends those channels (default 60/30/10).
Optional `--perm-importance` uses a sklearn permutation test on the holdout set (useful when
gain shares are tiny).
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

import numpy as np
import pandas as pd
from sklearn.inspection import permutation_importance
from sklearn.metrics import mean_absolute_error

from backend.ml_training import train_models_for_frame
from backend.pipeline import build_supervised_frame, xgb_feature_weights_for_column_sampling


def _print_xgb_gain_ranking(model, names: list[str]) -> None:
    """Print normalized gain share per feature (booster uses feature names when available)."""
    booster = model.get_booster()
    raw = booster.get_score(importance_type="gain")
    if not raw:
        print("  (no split gains — model may be degenerate; check hyperparameters)")
        return
    pairs: list[tuple[str, float]] = []
    for i, n in enumerate(names):
        g = float(raw.get(n, raw.get(f"f{i}", 0.0)))
        pairs.append((n, g))
    ssum = sum(g for _, g in pairs) or 1.0
    for name, g in sorted(pairs, key=lambda x: -x[1]):
        print(f"  {name}: share={g / ssum:.4f}  (raw gain {g:.8f})")


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
    ap.add_argument(
        "--perm-importance",
        action="store_true",
        help="Print permutation importance on the holdout set (slower; validates news/weather use)",
    )
    ap.add_argument(
        "--xgb-feature-weights",
        action="store_true",
        help="Down-weight price lags in column sampling (also set env RICE_XGB_FEATURE_WEIGHTS=1)",
    )
    args = ap.parse_args()

    if args.mock_sentiment:
        os.environ["RICE_SENTIMENT_MOCK"] = "1"
    if args.xgb_feature_weights:
        os.environ["RICE_XGB_FEATURE_WEIGHTS"] = "1"

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

    try:
        csv_display = str(args.csv.relative_to(_ROOT))
    except ValueError:
        csv_display = str(args.csv)

    models_dir = args.save_model.parent
    report, fitted_full = train_models_for_frame(
        df,
        models_dir,
        csv_display=csv_display,
        test_size=args.test_size,
        seed=args.seed,
        save=not args.no_save_model,
        channel_only=False,
        no_hgb=args.no_hgb,
        xgb_feature_weights=args.xgb_feature_weights,
        full_xgb_path=args.save_model,
        hgb_path=args.save_hgb,
        report_path=args.save_report,
    )

    X, y = build_supervised_frame(df)
    split = int(len(X) * (1 - args.test_size))
    split = max(1, min(split, len(X) - 1))
    X_train, X_test = X.iloc[:split], X.iloc[split:]
    y_train, y_test = y.iloc[:split], y.iloc[split:]

    ch_mae = report.get("channel_mae_test") or {}
    print("Channel test MAE (next-day %, per head):")
    for k in ("price", "news", "weather"):
        if k in ch_mae:
            print(f"  {k}: {float(ch_mae[k]):.4f}")
    print(
        f"Channel blend (60/30/10 price/news/weather) test MAE: "
        f"{report['channel_blend_mae_test']:.4f}"
    )

    if not args.no_save_model:
        print(f"Wrote report to {args.save_report}")

    mae_x = report["metrics"]["test_mae_xgb_pct"]
    mae_h = report["metrics"].get("test_mae_hgb_pct")
    mae_blend = report["metrics"].get("test_mae_blend_pct")
    blend_weights = report["blend_weights"]
    print(f"Test MAE XGB (next-day % change): {mae_x:.4f}")
    if mae_h is not None and mae_blend is not None:
        print(f"Test MAE HGB: {mae_h:.4f}")
        print(
            f"Test MAE blend: {mae_blend:.4f}  (weights xgb={blend_weights['xgb']:.3f} hgb={blend_weights['hgb']:.3f})"
        )

    model = fitted_full
    if model is None:
        raise RuntimeError("train_models_for_frame did not return full XGB model")
    print(
        "Full-model XGB (gain from booster; sklearn 'weight' importances often skew to lags on tiny data):"
    )
    _print_xgb_gain_ranking(model, list(X.columns))

    if args.perm_importance and len(X_test) >= 4:
        if len(X_test) < 12:
            print(
                "Permutation importance skipped: holdout has only "
                f"{len(X_test)} rows — use more CSV rows or smaller --test-size for stable perm scores."
            )
        else:
            print(
                "Permutation importance (mean increase in MAE when feature shuffled; "
                "larger = more useful on the holdout set):"
            )
            perm = permutation_importance(
                model,
                X_test,
                y_test,
                scoring="neg_mean_absolute_error",
                n_repeats=12,
                random_state=args.seed,
                n_jobs=1,
            )
            order = np.argsort(-perm.importances_mean)
            for i in order[: min(14, len(order))]:
                col = X.columns[int(i)]
                m = perm.importances_mean[i]
                s = perm.importances_std[i]
                print(f"  {col}: {m:.6f} (+/- {s:.6f})")


if __name__ == "__main__":
    main()
