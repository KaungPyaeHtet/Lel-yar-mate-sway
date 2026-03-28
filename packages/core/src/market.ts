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
