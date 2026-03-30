#!/usr/bin/env python3
"""
Train one channel-blend XGB bundle per commodity CSV (fast path: no full XGB / HGB files).

Expects CSVs from ``scripts/xlsx_to_market.py`` → ``backend/data/ml_items/<market_item_id>.csv``.
Writes ``backend/models/by_item/<id>/rice_xgb_{price,news,weather}.json`` + ``training_report.json``.

At inference, POST ``market_item_id`` to ``/api/predict/next-day-pct`` so the API loads that folder
(cached in memory after first request — fast for demos).

Examples:
  RICE_SENTIMENT_MOCK=1 python backend/train_per_item.py
  RICE_SENTIMENT_MOCK=1 python backend/train_per_item.py --only abc123def4567890
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import backend.native_env  # noqa: F401

import pandas as pd

from backend.ml_training import train_models_for_frame

_DEFAULT_DATA = _ROOT / "backend" / "data" / "ml_items"
_DEFAULT_OUT = _ROOT / "backend" / "models" / "by_item"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--data-dir",
        type=Path,
        default=_DEFAULT_DATA,
        help="Directory of <item_id>.csv files",
    )
    ap.add_argument(
        "--out-dir",
        type=Path,
        default=_DEFAULT_OUT,
        help="Root directory for per-item model folders",
    )
    ap.add_argument("--test-size", type=float, default=0.2)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument(
        "--mock-sentiment",
        action="store_true",
        help="Set RICE_SENTIMENT_MOCK=1",
    )
    ap.add_argument(
        "--only",
        type=str,
        default="",
        help="Train a single item id (hex id from MARKET_ITEMS)",
    )
    ap.add_argument(
        "--min-supervised-rows",
        type=int,
        default=8,
        help="Skip CSVs that yield fewer supervised rows after feature construction",
    )
    args = ap.parse_args()

    if args.mock_sentiment:
        os.environ["RICE_SENTIMENT_MOCK"] = "1"

    if not args.data_dir.is_dir():
        print(
            f"Missing {args.data_dir}. Run: python scripts/xlsx_to_market.py",
            file=sys.stderr,
        )
        sys.exit(1)

    args.out_dir.mkdir(parents=True, exist_ok=True)
    csv_paths = sorted(args.data_dir.glob("*.csv"))
    if args.only.strip():
        target = args.data_dir / f"{args.only.strip()}.csv"
        csv_paths = [target] if target.is_file() else []

    manifest_items: list[dict[str, object]] = []
    for csv_path in csv_paths:
        item_id = csv_path.stem
        df = pd.read_csv(csv_path)
        required = {"date", "avg_price", "rainfall_mm", "temp_c", "news_headline"}
        if required - set(df.columns):
            print(f"skip {item_id}: bad columns", file=sys.stderr)
            continue
        out_item = args.out_dir / item_id
        try:
            report, _ = train_models_for_frame(
                df,
                out_item,
                csv_display=str(csv_path.relative_to(_ROOT)),
                test_size=args.test_size,
                seed=args.seed,
                save=True,
                channel_only=True,
                no_hgb=True,
                xgb_feature_weights=False,
            )
        except ValueError as e:
            print(f"skip {item_id}: {e}", file=sys.stderr)
            continue
        n_sup = report.get("n_supervised_rows", 0)
        if n_sup < args.min_supervised_rows:
            print(f"skip {item_id}: only {n_sup} supervised rows", file=sys.stderr)
            if out_item.is_dir():
                shutil.rmtree(out_item, ignore_errors=True)
            continue
        manifest_items.append(
            {
                "id": item_id,
                "csv": str(csv_path.relative_to(_ROOT)),
                "n_supervised_rows": n_sup,
                "channel_blend_mae_test": report.get("channel_blend_mae_test"),
            }
        )
        print(f"ok {item_id}  rows={n_sup}  ch_MAE={report.get('channel_blend_mae_test')}")

    trained_at = datetime.now(timezone.utc).isoformat()
    (args.out_dir / "manifest.json").write_text(
        json.dumps(
            {
                "trained_at": trained_at,
                "count": len(manifest_items),
                "items": manifest_items,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(manifest_items)} item bundles under {args.out_dir}")


if __name__ == "__main__":
    main()
