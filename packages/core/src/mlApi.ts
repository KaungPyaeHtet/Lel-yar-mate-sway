/**
 * Optional Python FastAPI backend (`backend/server.py`).
 *
 * Web: set `VITE_ML_API_URL` in `.env` at **build** time for deployed sites. In dev, Vite sets
 * a localhost default. If you `vite build` then `vite preview` without env, the bundle has
 * no URL unless the page is opened from **localhost** / **127.0.0.1** — then we default to
 * `http://127.0.0.1:8000` so `npm run ml:api` works without rebuilding.
 *
 * Expo: set `EXPO_PUBLIC_ML_API_URL` in `.env` or `app.config` extra (use your PC’s LAN IP for Expo Go).
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

/** When the web app is opened from localhost, assume ML API on same machine (common dev/preview). */
function mlApiDefaultLocalhostBrowser(): string {
  if (typeof window === "undefined") return "";
  const h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1") {
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
  return (
    readWebViteDefine() ||
    readProcessMlUrl() ||
    mlApiDefaultLocalhostBrowser()
  );
}

async function postJsonWithNetworkHint<T>(
  url: string,
  body: Record<string, unknown>
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!r.ok) throw new Error(await r.text());
    return (await r.json()) as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(
        `ML request timeout at ${url}. Check ML API server and Wi-Fi connection.`
      );
    }
    const m = err instanceof Error ? err.message : String(err);
    const isLikelyReachability =
      /network request failed|fetch failed|failed to fetch|networkerror/i.test(m);
    if (isLikelyReachability) {
      throw new Error(
        `Cannot reach ML backend at ${url}. Make sure phone and laptop are on the same Wi-Fi, Expo Go Local Network permission is enabled, and backend is running.`
      );
    }
    throw err instanceof Error ? err : new Error(String(err));
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchMlSentiment(headlines: string[]): Promise<number> {
  const base = getMlApiBaseUrl();
  if (!base) throw new Error("ML API URL not configured");
  const j = await postJsonWithNetworkHint<{ score: number }>(
    `${base}/api/sentiment`,
    { headlines }
  );
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
  /** Present when API uses 60/30/10 price/news/weather channel heads. */
  channelPricePct?: number;
  channelNewsPct?: number;
  channelWeatherPct?: number;
  channelBlendWeights?: { price: number; news: number; weather: number };
  /** Curated knowledge chunk titles prepended to news for this run (RAG). */
  ragSources?: string[];
};

type RawNextDayPredict = {
  next_day_pct_change?: unknown;
  sentiment_score?: unknown;
  price_change_1d_pct?: unknown;
  price_change_7d_pct?: unknown;
  temp_c?: unknown;
  rainfall_mm?: unknown;
  confidence_hint?: unknown;
  next_day_pct_channel_price?: unknown;
  next_day_pct_channel_news?: unknown;
  next_day_pct_channel_weather?: unknown;
  channel_blend_weights?: unknown;
  rag_sources?: unknown;
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
  const out: MlNextDayDetail = {
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
  const cp = j.next_day_pct_channel_price;
  const cn = j.next_day_pct_channel_news;
  const cw = j.next_day_pct_channel_weather;
  if (typeof cp === "number" && !Number.isNaN(cp)) out.channelPricePct = cp;
  if (typeof cn === "number" && !Number.isNaN(cn)) out.channelNewsPct = cn;
  if (typeof cw === "number" && !Number.isNaN(cw)) out.channelWeatherPct = cw;
  const bl = j.channel_blend_weights;
  if (
    bl &&
    typeof bl === "object" &&
    typeof (bl as { price?: unknown }).price === "number" &&
    typeof (bl as { news?: unknown }).news === "number" &&
    typeof (bl as { weather?: unknown }).weather === "number"
  ) {
    out.channelBlendWeights = {
      price: (bl as { price: number }).price,
      news: (bl as { news: number }).news,
      weather: (bl as { weather: number }).weather,
    };
  }
  const rs = j.rag_sources;
  if (Array.isArray(rs) && rs.every((x) => typeof x === "string")) {
    out.ragSources = rs as string[];
  }
  return out;
}

export async function fetchMlNextDayDetail(p: {
  avgPrices: number[];
  rainfallMm: number;
  tempC: number;
  newsHeadline: string;
  /**
   * `MarketItem.id` from the workbook — selects `backend/models/by_item/<id>/` when trained
   * with `npm run ml:train:items` (falls back to global models).
   */
  marketItemId?: string;
  /** Last ~30 days rain (mm) and temperature (°C), oldest→newest — from Open-Meteo history. */
  rainfallMmHistory?: number[];
  tempCHistory?: number[];
  /** ~30 pseudo-daily headline strings — from `newsHeadlinesForMlHistory` in `@agriora/core`. */
  newsHeadlinesHistory?: string[];
  /** Used if the API returns a legacy body with only next_day_pct_change. */
  fallbackMomentum?: { change1dPct: number; change7dPct: number } | null;
}): Promise<MlNextDayDetail> {
  const base = getMlApiBaseUrl();
  if (!base) throw new Error("ML API URL not configured");
  const body: Record<string, unknown> = {
    avg_prices: p.avgPrices,
    rainfall_mm: p.rainfallMm,
    temp_c: p.tempC,
    news_headline: p.newsHeadline,
  };
  if (p.marketItemId != null && String(p.marketItemId).trim() !== "") {
    body.market_item_id = String(p.marketItemId).trim();
  }
  if (p.rainfallMmHistory && p.rainfallMmHistory.length > 0) {
    body.rainfall_mm_history = p.rainfallMmHistory;
  }
  if (p.tempCHistory && p.tempCHistory.length > 0) {
    body.temp_c_history = p.tempCHistory;
  }
  if (p.newsHeadlinesHistory && p.newsHeadlinesHistory.length > 0) {
    body.news_headlines_history = p.newsHeadlinesHistory;
  }
  const j = await postJsonWithNetworkHint<RawNextDayPredict>(
    `${base}/api/predict/next-day-pct`,
    body
  );
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
