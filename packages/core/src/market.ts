import { analyzeWithRules } from "./sentiment";
import type { MarketItem, PriceObservation } from "./marketTypes";
import {
  MARKET_GENERATED_AT_ISO,
  MARKET_ITEMS,
  MARKET_PERIODS_ISO,
  MARKET_SOURCE_FILE,
} from "./marketData.generated";

export type { MarketItem, PriceObservation } from "./marketTypes";

export {
  MARKET_GENERATED_AT_ISO,
  MARKET_ITEMS,
  MARKET_PERIODS_ISO,
  MARKET_SOURCE_FILE,
};

function mid(o: PriceObservation): number | null {
  const { low, high } = o;
  if (low != null && high != null) return (low + high) / 2;
  if (low != null) return low;
  if (high != null) return high;
  return null;
}

/** Latest observation by lexicographic dateIso (works for ISO dates in sheet). */
export function latestObservation(
  item: MarketItem
): PriceObservation | null {
  const obs = [...item.observations];
  if (obs.length === 0) return null;
  obs.sort((a, b) => a.dateIso.localeCompare(b.dateIso));
  return obs[obs.length - 1]!;
}

export function latestMidpoint(item: MarketItem): number | null {
  const last = latestObservation(item);
  return last ? mid(last) : null;
}

/** % change of latest mid vs previous day and vs 7 observations back (needs 8 prices). */
export function midPriceMomentumPct(
  pricesOldestToNewest: number[]
): { change1dPct: number; change7dPct: number } | null {
  const p = pricesOldestToNewest;
  if (p.length < 8) return null;
  const last = p[p.length - 1]!;
  const p1 = p[p.length - 2]!;
  const p7 = p[p.length - 8]!;
  return {
    change1dPct: (last / p1 - 1) * 100,
    change7dPct: (last / p7 - 1) * 100,
  };
}

/**
 * Last `count` usable mid-prices (from sheet observations), oldest → newest.
 * For Python ML API: need at least 8 points.
 */
export function recentMidPricesForMl(
  item: MarketItem,
  count = 8
): number[] | null {
  const obsSorted = [...item.observations].sort((a, b) =>
    a.dateIso.localeCompare(b.dateIso)
  );
  const mids: number[] = [];
  for (const o of obsSorted) {
    const m = mid(o);
    if (m != null) mids.push(m);
  }
  if (mids.length < count) return null;
  return mids.slice(-count);
}

/** Usable mid prices from the sheet, oldest → newest (no padding). */
export function observationMidsOldestToNewest(item: MarketItem): number[] {
  const obsSorted = [...item.observations].sort((a, b) =>
    a.dateIso.localeCompare(b.dateIso)
  );
  const mids: number[] = [];
  for (const o of obsSorted) {
    const m = mid(o);
    if (m != null) mids.push(m);
  }
  return mids;
}

/**
 * Last `count` mids for the ML API (`/api/predict/next-day-pct` requires 8).
 * If the sheet has fewer survey columns, the earliest mid is repeated at the
 * front so the latest values stay the real trail (hackathon / demo behaviour).
 */
export function recentMidPricesForInference(
  item: MarketItem,
  count = 8
): number[] | null {
  const mids = observationMidsOldestToNewest(item);
  if (mids.length === 0) return null;
  const out = [...mids];
  const first = out[0]!;
  while (out.length < count) {
    out.unshift(first);
  }
  return out.slice(-count);
}

/**
 * Turn the backend’s next-day % into Kyat using the latest sheet mid; band uses
 * the same spread heuristic as {@link predictItemPrice}.
 */
export function forecastKyatFromMlPct(
  latestMid: number,
  nextDayPctChange: number,
  baselineLow: number | null,
  baselineHigh: number | null
): { mid: number; low: number; high: number } {
  const raw = latestMid * (1 + nextDayPctChange / 100);
  const span =
    baselineLow != null && baselineHigh != null
      ? baselineHigh - baselineLow
      : latestMid * 0.06;
  const half = Math.max(span / 2, latestMid * 0.02);
  return {
    mid: Math.round(raw),
    low: Math.round(Math.max(0, raw - half)),
    high: Math.round(raw + half),
  };
}

/** First sheet row usable for charts + ML, or the first row in the workbook export. */
export function getDefaultMarketItemForUi(): MarketItem {
  for (const it of MARKET_ITEMS) {
    if (recentMidPricesForInference(it, 8) != null) return it;
  }
  return MARKET_ITEMS[0]!;
}

export function searchMarketItems(query: string): MarketItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...MARKET_ITEMS];
  return MARKET_ITEMS.filter((it) => {
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

export function getMarketItemById(id: string): MarketItem | undefined {
  return MARKET_ITEMS.find((it) => it.id === id);
}

/** WFP food rows use this `group` value (meat, fish, eggs). */
export const FARMING_LIVESTOCK_GROUP = "မွေးမြူရေး";

/** Workbook + demo rows + crop (veg/fruit) food series — excludes livestock-only items. */
export const FARMING_PLANT_ITEMS: readonly MarketItem[] = MARKET_ITEMS.filter(
  (it) => it.group !== FARMING_LIVESTOCK_GROUP
);

/** Meat, fish, eggs series from food CSV (`မွေးမြူရေး`). */
export const FARMING_LIVESTOCK_ITEMS: readonly MarketItem[] = MARKET_ITEMS.filter(
  (it) => it.group === FARMING_LIVESTOCK_GROUP
);

export function searchMarketItemsIn(
  items: readonly MarketItem[],
  query: string
): MarketItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...items];
  return items.filter((it) => {
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

/** Simple trend: slope of mid vs index over last `window` points, capped. */
function trendMultiplier(obsSorted: PriceObservation[], window = 4): number {
  const mids: number[] = [];
  for (const o of obsSorted) {
    const m = mid(o);
    if (m != null) mids.push(m);
  }
  if (mids.length < 2) return 1;
  const slice = mids.slice(-window);
  if (slice.length < 2) return 1;
  const n = slice.length;
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += slice[i]!;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = i - meanX;
    num += dx * (slice[i]! - meanY);
    den += dx * dx;
  }
  if (den === 0) return 1;
  const slope = num / den;
  const rel = meanY !== 0 ? slope / meanY : 0;
  const capped = Math.max(-0.04, Math.min(0.04, rel));
  return 1 + capped;
}

/**
 * Weather stress heuristic for crop logistics (demo only, not agronomic advice).
 * Severe convection / heavy rain nudges up; calm clear nudges neutral.
 */
export function weatherPriceModifier(
  weatherCode: number,
  temperatureC: number
): { factor: number; label: string } {
  if (weatherCode >= 95) {
    return { factor: 1.012, label: "Severe weather (storm) — small upward nudge" };
  }
  if (weatherCode >= 80 && weatherCode <= 82) {
    return { factor: 1.006, label: "Showers — slight upward nudge" };
  }
  if (weatherCode >= 61 && weatherCode <= 67 && temperatureC >= 30) {
    return { factor: 1.008, label: "Warm heavy rain — slight stress nudge" };
  }
  if (temperatureC >= 38) {
    return { factor: 1.01, label: "Very high heat — small stress nudge" };
  }
  if (weatherCode === 0 && temperatureC >= 20 && temperatureC <= 32) {
    return { factor: 1, label: "Calm conditions — neutral" };
  }
  return { factor: 1.002, label: "Other weather — tiny nudge" };
}

export type PricePrediction = {
  disclaimer: string;
  baselineMid: number;
  baselineLow: number | null;
  baselineHigh: number | null;
  baselineDateIso: string | null;
  predictedMid: number;
  predictedLow: number;
  predictedHigh: number;
  factors: {
    trend: number;
    news: number;
    newsVerdict: string;
    weather: number;
    weatherNote: string;
  };
};

/**
 * Blend spreadsheet baseline with optional news + weather signals.
 * For hackathon / education only — not trading or policy advice.
 */
/**
 * When the chart shows a sharp move but RSS text is neutral, avoid implying “stable”
 * prices in copy that summarizes the rules-based news read (ML block rationale).
 */
export function blendScreenNewsVerdictWithMomentum(
  fromNewsRules: "up" | "down" | "flat",
  change1dPct?: number | null,
  change7dPct?: number | null
): "up" | "down" | "flat" {
  const d1 =
    typeof change1dPct === "number" && !Number.isNaN(change1dPct)
      ? change1dPct
      : null;
  const d7 =
    typeof change7dPct === "number" && !Number.isNaN(change7dPct)
      ? change7dPct
      : null;
  if (d1 != null && d1 <= -3.5) return "down";
  if (d7 != null && d7 <= -5.5) return "down";
  if (d1 != null && d1 >= 3.5) return "up";
  if (d7 != null && d7 >= 6.0) return "up";
  return fromNewsRules;
}

export function predictItemPrice(
  item: MarketItem,
  options?: {
    newsText?: string;
    weatherCode?: number;
    temperatureC?: number;
  }
): PricePrediction | null {
  const last = latestObservation(item);
  const baselineMid = latestMidpoint(item);
  if (last == null || baselineMid == null) return null;

  const obsSorted = [...item.observations].sort((a, b) =>
    a.dateIso.localeCompare(b.dateIso)
  );
  const trend = trendMultiplier(obsSorted);

  let newsFactor = 1;
  let newsVerdict = "flat";
  const raw = options?.newsText?.trim();
  if (raw) {
    const ctx = `${raw}\n${item.itemDetails}`;
    const a = analyzeWithRules(ctx);
    newsVerdict = a.verdict;
    newsFactor = 1 + Math.max(-1, Math.min(1, a.avgBlend)) * 0.07;
  }

  let weatherFactor = 1;
  let weatherNote = "No weather signal";
  if (
    options?.weatherCode != null &&
    typeof options.temperatureC === "number"
  ) {
    const w = weatherPriceModifier(options.weatherCode, options.temperatureC);
    weatherFactor = w.factor;
    weatherNote = w.label;
  }

  const combined = baselineMid * trend * newsFactor * weatherFactor;
  const span =
    last.low != null && last.high != null
      ? last.high - last.low
      : baselineMid * 0.06;
  const half = Math.max(span / 2, baselineMid * 0.02);

  return {
    disclaimer:
      "Illustrative model only — not financial, legal, or agronomic advice.",
    baselineMid,
    baselineLow: last.low,
    baselineHigh: last.high,
    baselineDateIso: last.dateIso,
    predictedMid: Math.round(combined),
    predictedLow: Math.round(Math.max(0, combined - half)),
    predictedHigh: Math.round(combined + half),
    factors: {
      trend,
      news: newsFactor,
      newsVerdict,
      weather: weatherFactor,
      weatherNote,
    },
  };
}

const ML_NEWS_HEADLINE_MAX = 4000;

/**
 * Suffix global RSS/news text with the selected sheet row so ML sentiment + nf_*
 * features are not identical for every commodity (price lags already differ).
 */
export function mlNewsHeadlineForItem(
  newsBlob: string,
  item: MarketItem,
  maxChars = ML_NEWS_HEADLINE_MAX
): string {
  const focus = `Commodity context: ${item.itemCategory}. ${item.itemDetails}`;
  const base = newsBlob.trim() || "Commodity markets.";
  const suffix = ` ${focus}`;
  let combined = `${base}${suffix}`;
  if (combined.length <= maxChars) return combined;
  const maxBase = Math.max(96, maxChars - suffix.length - 2);
  const trimmed =
    base.length > maxBase ? `${base.slice(0, maxBase - 1)}…` : base;
  combined = `${trimmed}${suffix}`;
  return combined.length <= maxChars
    ? combined
    : `${combined.slice(0, maxChars - 1)}…`;
}

/**
 * Split RSS/news text into ~`maxDays` strings so the ML backend can treat them like
 * a multi-day headline window (aligned with 30-day rolling news in training).
 */
export function newsHeadlinesForMlHistory(
  combinedHeadline: string,
  maxDays = 30
): string[] {
  const t = combinedHeadline.trim();
  if (!t) {
    return Array.from({ length: maxDays }, () => "Commodity markets.");
  }
  const sentences = t
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length === 0) {
    return Array.from({ length: maxDays }, () => t);
  }
  if (sentences.length >= maxDays) {
    return sentences.slice(-maxDays);
  }
  const buckets: string[] = Array.from({ length: maxDays }, () => "");
  for (let i = 0; i < sentences.length; i++) {
    const b = i % maxDays;
    buckets[b] = buckets[b]
      ? `${buckets[b]} ${sentences[i]!}`
      : sentences[i]!;
  }
  const last = sentences[sentences.length - 1]!;
  for (let i = 0; i < maxDays; i++) {
    if (!buckets[i]!.trim()) buckets[i] = last;
  }
  return buckets;
}

/** Short label for advice UI (category + detail, truncated). */
export function shortMarketItemLabelForUi(
  item: MarketItem,
  maxChars = 120
): string {
  const s = [item.itemCategory, item.itemDetails].filter(Boolean).join(" · ");
  const t = s.trim() || item.id;
  if (t.length <= maxChars) return t;
  return `${t.slice(0, Math.max(0, maxChars - 1))}…`;
}
