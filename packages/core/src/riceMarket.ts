/**
 * Rice (စပါး)–focused market slice: rows from data.xlsx that mention rice/paddy,
 * plus demo seed rows aligned to sheet dates when the workbook has no rice yet.
 */

import {
  MARKET_GENERATED_AT_ISO,
  MARKET_ITEMS,
  MARKET_PERIODS_ISO,
} from "./marketData.generated";
import {
  getMarketItemById,
  recentMidPricesForInference,
  recentMidPricesForMl,
} from "./market";
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

/**
 * Default `MarketItem` id for the market tab: prefer the primary rice row when
 * it exists in the sheet export; otherwise the first row that can feed the ML API.
 */
export function initialMarketTabItemId(): string {
  const rice = getPrimaryRiceMarketItem();
  if (getMarketItemById(rice.id)) return rice.id;
  const fallback = MARKET_ITEMS.find(
    (it) => recentMidPricesForInference(it, 8) != null
  );
  return fallback?.id ?? MARKET_ITEMS[0]!.id;
}

/**
 * Default selection when the picker is limited (e.g. စိုက်ပျိုးရေး vs မွေးမြူရေး tabs).
 * Prefers the primary rice row if it appears in `items`, else the first row with ≥8 mids.
 */
export function initialMarketTabItemIdFrom(
  items: readonly MarketItem[]
): string {
  if (items.length === 0) return initialMarketTabItemId();
  const rice = getPrimaryRiceMarketItem();
  if (items.some((it) => it.id === rice.id)) return rice.id;
  const fallback = items.find(
    (it) => recentMidPricesForInference(it, 8) != null
  );
  return fallback?.id ?? items[0]!.id;
}

/** Mid-price points for charts, oldest → newest (full history). */
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

/** Default chart window: last N calendar days from the latest observation (UI only). */
export const CHART_DEFAULT_RECENT_DAYS = 30;
/** Food CSV rows show a broader history window for demos (about 10 months). */
export const CHART_FOOD_RECENT_DAYS = 31 * 10;

/** Food / WFP rows from `food_*cleaned*.csv` (national median series). */
export function isWfpFoodPriceItem(item: MarketItem): boolean {
  return item.mainCategory.includes("WFP") || item.itemDetails.includes("(WFP)");
}

/**
 * Chart series for the market UI: last ~`days` from the newest price (rolling window).
 * For monthly surveys this usually shows **two** recent points (e.g. mid-Nov and mid-Dec), not a single dot.
 *
 * ML / next-day prediction still uses the **full** `item.observations` trail elsewhere.
 */
export function riceMidSeriesForChartDisplay(
  item: MarketItem,
  days: number = CHART_DEFAULT_RECENT_DAYS
): { dateIso: string; mid: number }[] {
  const windowDays =
    days === CHART_DEFAULT_RECENT_DAYS && isWfpFoodPriceItem(item)
      ? CHART_FOOD_RECENT_DAYS
      : days;
  return riceMidSeriesForChartLastDays(item, windowDays);
}

/**
 * Chart series limited to the last `days` from the newest price point.
 * If that window has fewer than 2 points (e.g. monthly surveys), uses the last 2 points so the line still draws.
 */
export function riceMidSeriesForChartLastDays(
  item: MarketItem,
  days: number = CHART_DEFAULT_RECENT_DAYS
): { dateIso: string; mid: number }[] {
  const full = riceMidSeriesForChart(item);
  if (full.length === 0) return [];
  const last = full[full.length - 1]!;
  const lastDay = last.dateIso.slice(0, 10);
  const end = new Date(lastDay + "T12:00:00Z");
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days);
  const cutoffIso = start.toISOString().slice(0, 10);
  const filtered = full.filter((p) => p.dateIso.slice(0, 10) >= cutoffIso);
  if (filtered.length >= 2) return filtered;
  if (full.length >= 2) return full.slice(-2);
  return full;
}
