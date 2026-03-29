"""
Generate `rice_data.csv` with the schema expected by `train_from_csv.py`:

  date, avg_price, rainfall_mm, temp_c, news_headline
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd

HEADLINES = [
    "Rice futures steady as monsoon outlook improves for key growing regions.",
    "Export ban rumors weigh on Asian rice benchmarks amid supply fears.",
    "Drought in northern belt raises concern over paddy yields this season.",
    "Bumper harvest reports from delta states cap upside price momentum.",
    "Flooding along major rivers disrupts logistics and warehouse stocks.",
    "Strong export demand from neighboring countries supports local prices.",
    "Government releases strategic reserves to cool retail rice inflation.",
    "Cyclone threat prompts precautionary buying in wholesale markets.",
    "Record harvest expected after good monsoon rains across the basin.",
    "Heatwave stresses irrigation systems; farmers face higher input costs.",
]


def make_mock_rice_frame(n_days: int = 120, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    dates = pd.date_range("2024-01-01", periods=n_days, freq="D")
    # Random walk price with mean reversion
    noise = rng.normal(0, 0.008, n_days)
    level = np.zeros(n_days)
    level[0] = 42.0
    for t in range(1, n_days):
        level[t] = level[t - 1] * (1 + noise[t]) + rng.normal(0, 0.02)
        level[t] = max(level[t], 20.0)

    rainfall = np.clip(rng.normal(6, 4, n_days), 0, 25)
    temp_c = np.clip(rng.normal(29, 3, n_days), 18, 40)
    headlines = [rng.choice(HEADLINES) for _ in range(n_days)]

    return pd.DataFrame(
        {
            "date": dates,
            "avg_price": np.round(level, 2),
            "rainfall_mm": np.round(rainfall, 1),
            "temp_c": np.round(temp_c, 1),
            "news_headline": headlines,
        }
    )


def main() -> None:
    p = argparse.ArgumentParser(description="Write mock rice_data.csv")
    p.add_argument(
        "-o",
        "--out",
        type=Path,
        default=Path(__file__).resolve().parent / "data" / "rice_data.csv",
        help="Output CSV path",
    )
    p.add_argument("-n", "--days", type=int, default=120)
    p.add_argument("--seed", type=int, default=42)
    args = p.parse_args()
    args.out.parent.mkdir(parents=True, exist_ok=True)
    df = make_mock_rice_frame(n_days=args.days, seed=args.seed)
    df.to_csv(args.out, index=False)
    print(f"Wrote {len(df)} rows to {args.out}")


if __name__ == "__main__":
    main()
