"""Load WFP-style food CSV into market item dicts (no openpyxl dependency)."""

from __future__ import annotations

import csv
import hashlib
import math
import re
from datetime import datetime
from pathlib import Path
from statistics import median

ROOT = Path(__file__).resolve().parents[1]
FOOD_CSV_CANDIDATES = (
    ROOT / "backend" / "data" / "food_cleaned.csv",
    ROOT / "backend" / "data" / "food_prices_cleaned.csv",
)


def stable_id(parts: tuple[str, ...]) -> str:
    h = hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()
    return h[:16]


def _norm_csv_key(k: str) -> str:
    return re.sub(r"\s+", "_", (k or "").strip().lower())


def _food_row_norm(row: dict[str, str]) -> dict[str, str]:
    out: dict[str, str] = {}
    for key, val in row.items():
        out[_norm_csv_key(key)] = (val or "").strip()
    return out


def _food_category_bucket(raw: str) -> str | None:
    s = " ".join(raw.strip().lower().split())
    if s in ("meat, fish and eggs", "meat fish and eggs"):
        return "livestock"
    # For demo coverage, keep additional food groups under crop-farming bucket.
    if s in (
        "vegetables and fruits",
        "vegetables and fruit",
        "cereals and tubers",
        "oil and fats",
        "pulses and nuts",
        "miscellaneous food",
    ):
        return "crops"
    return None


def food_csv_market_items() -> list[dict]:
    """
    National median price by survey date from WFP-style CSV (vegetables/fruits;
    meat, fish, eggs). Emits rows with group စိုက်ပျိုးရေး / မွေးမြူရေး.
    """
    path = next((p for p in FOOD_CSV_CANDIDATES if p.is_file()), None)
    if path is None:
        return []

    agg: dict[tuple[str, str, str], dict[str, list[float]]] = {}

    with path.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            return []
        for raw in reader:
            row = _food_row_norm(raw)
            bucket = _food_category_bucket(row.get("category", ""))
            if bucket is None:
                continue
            com = row.get("commodity", "").strip()
            if not com:
                continue
            d_raw = (row.get("date") or "")[:10]
            if len(d_raw) < 10:
                continue
            try:
                datetime.strptime(d_raw, "%Y-%m-%d")
            except ValueError:
                continue
            try:
                price = float(row.get("price", ""))
            except (TypeError, ValueError):
                continue
            if price <= 0 or (isinstance(price, float) and math.isnan(price)):
                continue
            raw_cat = " ".join((row.get("category", "") or "").split())
            key = (bucket, raw_cat, com)
            agg.setdefault(key, {}).setdefault(d_raw, []).append(price)

    group_for = {"livestock": "မွေးမြူရေး", "crops": "စိုက်ပျိုးရေး"}
    main_for = {
        "livestock": "WFP — မွေးမြူရေး",
        "crops": "WFP — စိုက်ပျိုးရေး (သစ်သီးနှင့် ဟင်းသီးဟင်းရွက်)",
    }
    out_items: list[dict] = []
    base_row = 30_000
    for idx, ((bucket, raw_cat, com), by_date) in enumerate(sorted(agg.items())):
        dates_sorted = sorted(by_date.keys())
        observations: list[dict] = []
        for d_iso in dates_sorted:
            prices = by_date[d_iso]
            mid = float(median(prices))
            w = max(mid * 0.008, 1.0)
            lo, hi = max(0.0, mid - w), mid + w
            observations.append(
                {"dateIso": d_iso, "low": round(lo, 2), "high": round(hi, 2)}
            )
        if len(observations) < 2:
            continue
        out_items.append(
            {
                "id": stable_id(("food_csv", bucket, com)),
                "excelRow": base_row + idx,
                "group": group_for[bucket],
                "mainCategory": main_for[bucket],
                "category": raw_cat or ("meat, fish and eggs" if bucket == "livestock" else "food"),
                "itemCategory": com,
                "itemDetails": f"{com} · တစ်ကီလို ဈေးနှုန်း (WFP)",
                "observations": observations,
            }
        )

    return out_items
