#!/usr/bin/env python3
"""
Backtests for the next-day % XGBoost model.

**Window mode** — fixed train / test calendar slices (good for demos; often very few test rows).

**Walk-forward mode** — expanding window: for each day after `--min-train`, fit on all prior
rows only, predict that day. Many more evaluation points from the same CSV → stabler MAE /
direction stats (still not a guarantee of live performance).

Examples:

  RICE_SENTIMENT_MOCK=1 python backend/backtest_window.py --csv backend/data/rice_data.csv \\
    --walk-forward --min-train 8

  RICE_SENTIMENT_MOCK=1 python backend/backtest_window.py --csv backend/data/rice_data.csv \\
    --train-start 2026-03-14 --train-end 2026-03-20 \\
    --test-dates 2026-03-21,2026-03-23

Each **test row** is a supervised observation: **target** = % move to the **next** calendar day.
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

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error

from backend.pipeline import build_supervised_frame_with_dates, make_xgb_regressor_for_backtest

DEADBAND_ADVICE = 0.075
EPS_MOVE = 1e-4  # treat |actual %| below this as "flat" for direction stats


def _parse_dates(raw: str) -> list[pd.Timestamp]:
    parts = [p.strip() for p in raw.split(",") if p.strip()]
    return [pd.to_datetime(p).normalize() for p in parts]


def _metrics_block(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    *,
    label: str,
    dead: float = DEADBAND_ADVICE,
) -> None:
    mae = mean_absolute_error(y_true, y_pred)
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    n = len(y_true)
    bias = float(np.mean(y_pred - y_true))

    # Sign match when actual move is meaningfully non-zero
    nz = np.abs(y_true) > EPS_MOVE
    n_nz = int(np.sum(nz))
    if n_nz > 0:
        dir_pct = float(np.mean(np.sign(y_true[nz]) == np.sign(y_pred[nz])) * 100.0)
    else:
        dir_pct = float("nan")

    # Include zeros: sign(0)=0, so compare "flat actual" vs small predicted move
    sign_all = np.mean(np.sign(y_true) == np.sign(y_pred)) * 100.0

    print(f"\n=== {label} ===")
    print(f"  n = {n}  |  MAE = {mae:.4f}%  |  RMSE = {rmse:.4f}%  |  mean(pred−actual) = {bias:+.4f}%")
    print(
        f"  Direction (sign match, all rows): {sign_all:.1f}%  |  "
        f"non-zero actual only (n={n_nz}): {dir_pct:.1f}%"
    )
    if n < 8:
        print(
            "  Note: Few evaluation rows — MAE/direction are noisy; prefer --walk-forward "
            "on the full CSV for a fairer read."
        )


def run_walk_forward(
    X: pd.DataFrame,
    y: pd.Series,
    obs: pd.Series,
    *,
    min_train: int,
    seed: int,
    max_print: int,
) -> None:
    n = len(X)
    if n <= min_train:
        print(
            f"Need more supervised rows than --min-train ({min_train}); have {n}.",
            file=sys.stderr,
        )
        sys.exit(2)

    preds: list[float] = []
    actuals: list[float] = []
    dates: list[pd.Timestamp] = []

    for k in range(min_train, n):
        X_tr = X.iloc[:k].reset_index(drop=True)
        y_tr = y.iloc[:k].reset_index(drop=True)
        model = make_xgb_regressor_for_backtest(len(X_tr), random_state=seed)
        model.fit(X_tr, y_tr)
        p = float(model.predict(X.iloc[[k]])[0])
        preds.append(p)
        actuals.append(float(y.iloc[k]))
        dates.append(obs.iloc[k])

    y_t = np.array(actuals)
    y_p = np.array(preds)
    _metrics_block(
        y_t,
        y_p,
        label=f"Walk-forward ({len(preds)} one-step predictions, min_train={min_train})",
    )

    dead = DEADBAND_ADVICE
    print("\nPer-row (obs_date → next-day %): actual, predicted, advice")
    for i in range(len(preds)):
        if i >= max_print:
            rest = len(preds) - max_print
            print(f"  … {rest} more rows (use --max-print-rows to show more)")
            break
        a, pr = actuals[i], preds[i]
        adv = "hold" if pr > dead else "sell" if pr < -dead else "neutral"
        tgt = dates[i] + pd.Timedelta(days=1)
        print(
            f"  {dates[i].date()} (→ {tgt.date()}): "
            f"actual={a:+.4f}% pred={pr:+.4f}% → {adv}"
        )


def run_fixed_window(
    X: pd.DataFrame,
    y: pd.Series,
    obs: pd.Series,
    *,
    t0: pd.Timestamp,
    t1: pd.Timestamp,
    test_norm: list[pd.Timestamp],
    seed: int,
) -> None:
    train_mask = (obs >= t0) & (obs <= t1)
    test_mask = obs.isin(test_norm)

    X_tr = X.loc[train_mask].reset_index(drop=True)
    y_tr = y.loc[train_mask].reset_index(drop=True)
    X_te = X.loc[test_mask].reset_index(drop=True)
    y_te = y.loc[test_mask].reset_index(drop=True)
    dates_te = obs.loc[test_mask].reset_index(drop=True)

    if len(X_tr) < 4:
        print(
            f"Train set very small ({len(X_tr)} rows). Add more CSV history or widen window.",
            file=sys.stderr,
        )
    if len(X_te) == 0:
        print(
            "No test rows match --test-dates (check dates exist after lag masking).",
            file=sys.stderr,
        )
        sys.exit(2)

    model = make_xgb_regressor_for_backtest(len(X_tr), random_state=seed)
    model.fit(X_tr, y_tr)
    pred = model.predict(X_te)

    y_t = y_te.values.astype(np.float64)
    y_p = pred.astype(np.float64)
    _metrics_block(y_t, y_p, label="Fixed window")

    print(f"\nTrain rows: {len(X_tr)} ({t0.date()} … {t1.date()})")
    print(f"Test rows:  {len(X_te)}  obs dates: {[str(d.date()) for d in dates_te]}")
    print("\nPer-row (obs_date → next day %): actual, predicted, advice")
    dead = DEADBAND_ADVICE
    for i in range(len(y_te)):
        a, p = float(y_te.iloc[i]), float(y_p[i])
        adv = "hold" if p > dead else "sell" if p < -dead else "neutral"
        day = dates_te.iloc[i]
        tgt = day + pd.Timedelta(days=1)
        print(
            f"  {day.date()} (→ {tgt.date()}): "
            f"actual={a:+.4f}% pred={p:+.4f}% → {adv}"
        )


def main() -> None:
    ap = argparse.ArgumentParser(
        description="Backtest next-day % model (window or walk-forward)"
    )
    ap.add_argument(
        "--csv",
        type=Path,
        default=_ROOT / "backend" / "data" / "rice_data.csv",
    )
    ap.add_argument(
        "--walk-forward",
        action="store_true",
        help="Expanding-window evaluation on the full supervised series (recommended)",
    )
    ap.add_argument(
        "--min-train",
        type=int,
        default=8,
        help="Walk-forward: first prediction uses this many training rows (default 8)",
    )
    ap.add_argument(
        "--max-print-rows",
        type=int,
        default=30,
        help="Walk-forward: max per-row lines to print (default 30)",
    )
    ap.add_argument("--train-start", type=str, default=None)
    ap.add_argument("--train-end", type=str, default=None)
    ap.add_argument(
        "--test-dates",
        type=str,
        default=None,
        help="Comma-separated observation dates (YYYY-MM-DD)",
    )
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument(
        "--mock-sentiment",
        action="store_true",
        help="Set RICE_SENTIMENT_MOCK=1",
    )
    args = ap.parse_args()

    if args.mock_sentiment:
        os.environ["RICE_SENTIMENT_MOCK"] = "1"

    if not args.csv.is_file():
        print(f"CSV not found: {args.csv}", file=sys.stderr)
        sys.exit(1)

    df = pd.read_csv(args.csv)
    X, y, obs = build_supervised_frame_with_dates(df)
    obs = obs.dt.normalize()

    if args.walk_forward:
        run_walk_forward(
            X,
            y,
            obs,
            min_train=args.min_train,
            seed=args.seed,
            max_print=args.max_print_rows,
        )
        return

    if not args.train_start or not args.train_end or not args.test_dates:
        ap.error(
            "Use --walk-forward, or provide --train-start, --train-end, and --test-dates"
        )

    t0 = pd.to_datetime(args.train_start).normalize()
    t1 = pd.to_datetime(args.train_end).normalize()
    test_norm = _parse_dates(args.test_dates)
    run_fixed_window(
        X,
        y,
        obs,
        t0=t0,
        t1=t1,
        test_norm=test_norm,
        seed=args.seed,
    )


if __name__ == "__main__":
    main()
