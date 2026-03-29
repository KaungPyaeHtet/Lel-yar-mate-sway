/**
 * Rice (စပါး)–focused market slice: rows from data.xlsx that mention rice/paddy,
 * plus demo seed rows aligned to sheet dates when the workbook has no rice yet.
 */

import {
  MARKET_GENERATED_AT_ISO,
  MARKET_ITEMS,
  MARKET_PERIODS_ISO,
} from "./marketData.generated";
import { recentMidPricesForMl } from "./market";
import type { MarketItem, PriceObservation } from "./marketTypes";

export { MARKET_GENERATED_AT_ISO as RICE_MARKET_SHEET_GENERATED_AT_ISO };

function observationMid(o: PriceObservation): number | null {
  const { low, high } = o;
  if (low != null && high != null) return (low + high) / 2;
  if (low != null) return low;
  if (high != null) return high;
  return null;
}

/** True when column D/E in the sheet indicate rice / paddy / milled rice. */
export function isRiceMarketItemFromSheet(it: MarketItem): boolean {
  const blob = `${it.itemCategory} ${it.itemDetails}`;
  if (blob.includes("စပါး")) return true;
  if (blob.includes("ဆန်")) return true;
  if (/ဆန်ခွဲ|ပေါင်စပါး|ဧရာဝတီစပါး/i.test(blob)) return true;
  return false;
}

function synthRiceObservations(
  baseMid: number,
  volatility = 0.014
): PriceObservation[] {
  return MARKET_PERIODS_ISO.map((dateIso, i) => {
    const drift = 1 + 0.0035 * Math.sin(i * 0.85) + i * 0.0011;
    const mid = baseMid * drift;
    const w = mid * volatility;
    return {
      dateIso,
      low: Math.round(Math.max(0, mid - w)),
      high: Math.round(mid + w),
    };
  });
}

function riceSeedItems(): MarketItem[] {
  const meta: Omit<MarketItem, "id" | "excelRow" | "observations">[] = [
    {
      group: "စိုက်ပျိုးရေး",
      mainCategory: "စိုက်ပျိုးရေးကုန်စည်",
      category: "စျေးနှုန်း",
      itemCategory: "စပါးအမျိုးမျိုး",
      itemDetails: "ဧရာဝတီ စပါးနှမ်း - သစ် - ၂၄ ပိဿာ",
    },
    {
      group: "စိုက်ပျိုးရေး",
      mainCategory: "စိုက်ပျိုးရေးကုန်စည်",
      category: "စျေးနှုန်း",
      itemCategory: "စပါးအမျိုးမျိုး",
      itemDetails: "ပေါင်စပါး မြန်မာ - သစ် - ၂၄ ပိဿာ",
    },
    {
      group: "စိုက်ပျိုးရေး",
      mainCategory: "စိုက်ပျိုးရေးကုန်စည်",
      category: "စျေးနှုန်း",
      itemCategory: "စပါးအမျိုးမျိုး",
      itemDetails: "ဆန်ခွဲျိုးသမီး - သစ် - ၅၀ ကီလို",
    },
    {
      group: "စိုက်ပျိုးရေး",
      mainCategory: "စိုက်ပျိုးရေးကုန်စည်",
      category: "စျေးနှုန်း",
      itemCategory: "စပါးအမျိုးမျိုး",
      itemDetails: "ဆန်တော - တောင်ငူ - သစ် - ၂၄ ပိဿာ",
    },
    {
      group: "စိုက်ပျိုးရေး",
      mainCategory: "စိုက်ပျိုးရေးကုန်စည်",
      category: "စျေးနှုန်း",
      itemCategory: "စပါးအမျိုးမျိုး",
      itemDetails: "အင်းစိန် ဆန်စပါး - သစ် - ၂၄ ပိဿာ",
    },
  ];
  const bases = [285_000, 268_000, 312_000, 245_000, 298_000];
  return meta.map((m, i) => ({
    id: `rice-demo-${i}`,
    excelRow: 10_000 + i,
    ...m,
    observations: synthRiceObservations(bases[i] ?? 270_000),
  }));
}

const _fromSheet = MARKET_ITEMS.filter(isRiceMarketItemFromSheet);

/** True when workbook had no rice rows — UI shows demo စပါးစျေး aligned to sheet dates. */
export const RICE_MARKET_USES_SEED_DATA = _fromSheet.length === 0;

/** Rice-only list: workbook rows if any, else demo စပါး series (same dates as sheet). */
export const RICE_MARKET_ITEMS: readonly MarketItem[] =
  _fromSheet.length > 0 ? _fromSheet : riceSeedItems();

export function searchRiceMarketItems(query: string): MarketItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...RICE_MARKET_ITEMS];
  return RICE_MARKET_ITEMS.filter((it) => {
    const hay = [
      it.group,
      it.mainCategory,
      it.category,
      it.itemCategory,
      it.itemDetails,
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function getRiceMarketItemById(id: string): MarketItem | undefined {
  return RICE_MARKET_ITEMS.find((it) => it.id === id);
}

/**
 * One rice series for the UI / ML path: prefer a row with ≥8 mid-prices for XGBoost,
 * else the first rice item (demo seed or sheet).
 */
export function getPrimaryRiceMarketItem(): MarketItem {
  for (const it of RICE_MARKET_ITEMS) {
    if (recentMidPricesForMl(it, 8) != null) return it;
  }
  return RICE_MARKET_ITEMS[0]!;
}

/** Mid-price points for charts, oldest → newest. */
export function riceMidSeriesForChart(
  item: MarketItem
): { dateIso: string; mid: number }[] {
  const sorted = [...item.observations].sort((a, b) =>
    a.dateIso.localeCompare(b.dateIso)
  );
  const out: { dateIso: string; mid: number }[] = [];
  for (const o of sorted) {
    const m = observationMid(o);
    if (m != null) out.push({ dateIso: o.dateIso, mid: m });
  }
  return out;
}
