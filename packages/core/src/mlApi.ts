/**
 * Optional Python FastAPI backend (`backend/server.py`).
 *
 * Web: set `VITE_ML_API_URL` in `.env`; Vite injects globals via `define` (Hermes cannot parse import-meta syntax).
 * Expo: set `EXPO_PUBLIC_ML_API_URL` in `.env` or `app.config` extra.
 */

declare const __AGRIORA_VITE_ML_URL__: string | undefined;
declare const __AGRIORA_VITE_DEV__: boolean | undefined;

/** Injected only when the web app is built with Vite (`apps/web/vite.config.ts`). */
function readWebViteDefine(): string {
  const url =
    typeof __AGRIORA_VITE_ML_URL__ !== "undefined"
      ? String(__AGRIORA_VITE_ML_URL__).trim()
      : "";
  if (url) return url.replace(/\/$/, "");
  if (
    typeof __AGRIORA_VITE_DEV__ !== "undefined" &&
    __AGRIORA_VITE_DEV__ === true
  ) {
    return "http://127.0.0.1:8000";
  }
  return "";
}

let mlApiBaseUrlOverride: string | undefined;

/**
 * Native/Expo can set this (e.g. infer your PC’s LAN IP for Expo Go when `.env` uses localhost).
 * Pass `null`, `undefined`, or `""` to clear.
 */
export function configureMlApiBaseUrl(url: string | null | undefined): void {
  if (url == null || url === "") {
    mlApiBaseUrlOverride = undefined;
    return;
  }
  const t = String(url).trim().replace(/\/$/, "");
  mlApiBaseUrlOverride = t || undefined;
}

function readProcessMlUrl(): string {
  // Use `process.env.EXPO_PUBLIC_*` directly so Expo’s Babel plugin can inline it (not via a temp variable).
  if (typeof process === "undefined" || !process.env) return "";
  const expoUrl = process.env.EXPO_PUBLIC_ML_API_URL;
  const viteUrl = process.env.VITE_ML_API_URL;
  const u =
    (typeof expoUrl === "string" ? expoUrl.trim() : "") ||
    (typeof viteUrl === "string" ? viteUrl.trim() : "");
  return u ? u.replace(/\/$/, "") : "";
}

/** Non-empty when frontend should call the Python API. */
export function getMlApiBaseUrl(): string {
  if (mlApiBaseUrlOverride) return mlApiBaseUrlOverride;
  return readWebViteDefine() || readProcessMlUrl();
}

export async function fetchMlSentiment(headlines: string[]): Promise<number> {
  const base = getMlApiBaseUrl();
  if (!base) throw new Error("ML API URL not configured");
  const r = await fetch(`${base}/api/sentiment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ headlines }),
  });
  if (!r.ok) throw new Error(await r.text());
  const j = (await r.json()) as { score: number };
  return j.score;
}

export type MlNextDayDetail = {
  nextDayPctChange: number;
  sentimentScore: number;
  priceChange1dPct: number;
  priceChange7dPct: number;
  tempC: number;
  rainfallMm: number;
  confidenceHint: number;
};

type RawNextDayPredict = {
  next_day_pct_change?: unknown;
  sentiment_score?: unknown;
  price_change_1d_pct?: unknown;
  price_change_7d_pct?: unknown;
  temp_c?: unknown;
  rainfall_mm?: unknown;
  confidence_hint?: unknown;
};

function parseNextDayPredict(
  j: RawNextDayPredict,
  fallbackMomentum?: { change1dPct: number; change7dPct: number }
): MlNextDayDetail {
  const y = j.next_day_pct_change;
  if (typeof y !== "number" || Number.isNaN(y)) {
    throw new Error("Invalid ML response: next_day_pct_change");
  }
  const num = (k: keyof RawNextDayPredict, fb: number) => {
    const v = j[k];
    return typeof v === "number" && !Number.isNaN(v) ? v : fb;
  };
  const d1 =
    num("price_change_1d_pct", fallbackMomentum?.change1dPct ?? 0) ?? 0;
  const d7 =
    num("price_change_7d_pct", fallbackMomentum?.change7dPct ?? 0) ?? 0;
  return {
    nextDayPctChange: y,
    sentimentScore: num("sentiment_score", 0),
    priceChange1dPct: d1,
    priceChange7dPct: d7,
    tempC: num("temp_c", 0),
    rainfallMm: num("rainfall_mm", 0),
    confidenceHint: Math.min(
      1,
      Math.max(0, num("confidence_hint", 0.5))
    ),
  };
}

export async function fetchMlNextDayDetail(p: {
  avgPrices: number[];
  rainfallMm: number;
  tempC: number;
  newsHeadline: string;
  /** Used if the API returns a legacy body with only next_day_pct_change. */
  fallbackMomentum?: { change1dPct: number; change7dPct: number } | null;
}): Promise<MlNextDayDetail> {
  const base = getMlApiBaseUrl();
  if (!base) throw new Error("ML API URL not configured");
  const r = await fetch(`${base}/api/predict/next-day-pct`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      avg_prices: p.avgPrices,
      rainfall_mm: p.rainfallMm,
      temp_c: p.tempC,
      news_headline: p.newsHeadline,
    }),
  });
  if (!r.ok) throw new Error(await r.text());
  const j = (await r.json()) as RawNextDayPredict;
  return parseNextDayPredict(j, p.fallbackMomentum ?? undefined);
}

/** Returns only the regressor’s next-day % estimate (same endpoint as {@link fetchMlNextDayDetail}). */
export async function fetchMlNextDayPct(p: {
  avgPrices: number[];
  rainfallMm: number;
  tempC: number;
  newsHeadline: string;
}): Promise<number> {
  const d = await fetchMlNextDayDetail({ ...p, fallbackMomentum: null });
  return d.nextDayPctChange;
}
