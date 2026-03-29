/**
 * Optional Python FastAPI backend (`backend/server.py`).
 *
 * Web: set `VITE_ML_API_URL` (e.g. http://192.168.1.5:8000) in `.env` for Vite.
 * Expo: set `EXPO_PUBLIC_ML_API_URL` in `.env` or `app.config` extra.
 */

function readViteMlUrl(): string {
  if (typeof import.meta === "object" && import.meta != null && "env" in import.meta) {
    const env = (import.meta as { env?: Record<string, unknown> }).env;
    const raw = env?.VITE_ML_API_URL;
    const u = typeof raw === "string" ? raw.trim() : "";
    if (u) return u.replace(/\/$/, "");
  }
  return "";
}

/** When Vite dev server runs and env var unset, assume API on same machine. */
function viteDevDefaultMlUrl(): string {
  if (typeof import.meta === "object" && import.meta != null && "env" in import.meta) {
    const env = (import.meta as { env?: { DEV?: boolean } }).env;
    if (env?.DEV === true) return "http://127.0.0.1:8000";
  }
  return "";
}

function readProcessMlUrl(): string {
  const p =
    typeof globalThis !== "undefined" &&
    "process" in globalThis &&
    typeof (globalThis as { process?: { env?: Record<string, string | undefined> } })
      .process?.env === "object"
      ? (globalThis as { process: { env: Record<string, string | undefined> } }).process
          .env
      : undefined;
  if (!p) return "";
  const u =
    p.EXPO_PUBLIC_ML_API_URL?.trim() ||
    p.VITE_ML_API_URL?.trim();
  return u ? u.replace(/\/$/, "") : "";
}

/** Non-empty when frontend should call the Python API. */
export function getMlApiBaseUrl(): string {
  return readViteMlUrl() || readProcessMlUrl() || viteDevDefaultMlUrl();
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
