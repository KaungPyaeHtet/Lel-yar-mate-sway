/**
 * Aggregates public RSS feeds (BBC Burmese, Google News, etc.).
 * Uses rss2json.com as a fallback when direct fetch fails (typical in browsers due to CORS).
 * Not affiliated with those services — check their terms for production use.
 */

export type NewsFeedScope = "myanmar" | "international";

export type NewsFeedSource = {
  id: string;
  /** Short label for UI (often Myanmar script) */
  label: string;
  /** BCP-47 style hint for typography / filtering */
  lang: "my" | "en";
  scope: NewsFeedScope;
  rssUrl: string;
};

/**
 * Curated list: Burmese-language outlets + Google News bundles (often English titles).
 */
export const NEWS_FEED_SOURCES: readonly NewsFeedSource[] = [
  {
    id: "bbc-burmese",
    label: "BBC မြန်မာ",
    lang: "my",
    scope: "myanmar",
    rssUrl: "https://feeds.bbci.co.uk/burmese/rss.xml",
  },
  {
    id: "google-myanmar",
    label: "Google News — မြန်မာ (ခေါင်းစဉ် အင်္ဂလိပ်)",
    lang: "en",
    scope: "myanmar",
    rssUrl:
      "https://news.google.com/rss/search?q=Myanmar&hl=en-US&gl=US&ceid=US:en",
  },
  {
    id: "google-ag-commodities",
    label: "Google News — စားနပ်ရိက္ခာ/ကမ္ဘာ့ဈေး (အင်္ဂလိပ်)",
    lang: "en",
    scope: "international",
    rssUrl:
      "https://news.google.com/rss/search?q=rice+wheat+food+commodity+prices&hl=en-US&gl=US&ceid=US:en",
  },
  {
    id: "google-seasia",
    label: "Google News — အရှေ့တောင်အာရှ (အင်္ဂလိပ်)",
    lang: "en",
    scope: "international",
    rssUrl:
      "https://news.google.com/rss/search?q=Southeast+Asia+economy&hl=en-US&gl=US&ceid=US:en",
  },
  {
    id: "google-oil-energy",
    label: "Google News — ဆီ/စွမ်းအင် ဈေး (အင်္ဂလိပ်)",
    lang: "en",
    scope: "international",
    rssUrl:
      "https://news.google.com/rss/search?q=crude+oil+OR+brent+OR+fuel+prices+OR+energy+commodity&hl=en-US&gl=US&ceid=US:en",
  },
  {
    id: "google-transport-logistics",
    label: "Google News — ပို့ဆောင်ရေး (အင်္ဂလိပ်)",
    lang: "en",
    scope: "international",
    rssUrl:
      "https://news.google.com/rss/search?q=shipping+freight+logistics+supply+chain+Asia&hl=en-US&gl=US&ceid=US:en",
  },
  {
    id: "google-myanmar-policy",
    label: "Google News — မြန်မာ မူဝါဒ/စီးပွား (အင်္ဂလိပ်)",
    lang: "en",
    scope: "myanmar",
    rssUrl:
      "https://news.google.com/rss/search?q=Myanmar+government+OR+policy+OR+economy+OR+export+OR+import&hl=en-US&gl=US&ceid=US:en",
  },
  {
    id: "google-weather-ag",
    label: "Google News — ရာသီဥတု/စိုက်ပျိုး (အင်္ဂလိပ်)",
    lang: "en",
    scope: "international",
    rssUrl:
      "https://news.google.com/rss/search?q=monsoon+OR+drought+OR+flood+OR+cyclone+agriculture+crop+rice&hl=en-US&gl=US&ceid=US:en",
  },
  {
    id: "mizzima-en",
    label: "Mizzima English",
    lang: "en",
    scope: "myanmar",
    rssUrl: "https://eng.mizzima.com/feed/",
  },
  {
    id: "irrawaddy",
    label: "The Irrawaddy",
    lang: "en",
    scope: "myanmar",
    rssUrl: "https://www.irrawaddy.com/feed/",
  },
];

/** Hostnames from configured feeds — use to lock down dev RSS proxies. */
export const NEWS_FEED_SOURCE_HOSTNAMES: readonly string[] = Array.from(
  new Set(
    NEWS_FEED_SOURCES.map((s) => {
      try {
        return new URL(s.rssUrl).hostname;
      } catch {
        return "";
      }
    }).filter((h): h is string => Boolean(h))
  )
).sort();

export type NewsHeadline = {
  title: string;
  link: string;
  pubDateMs: number;
  feedId: string;
  feedLabel: string;
  scope: NewsFeedScope;
  lang: "my" | "en";
};

const RSS2JSON_BASE = "https://api.rss2json.com/v1/api.json";

/** Optional: rewrite RSS URL for the first (direct) fetch only (e.g. same-origin dev proxy on web). */
let rewriteDirectFetchUrl: ((rssUrl: string) => string) | undefined;

export function configureNewsRssFetch(options: {
  rewriteDirectFetchUrl?: (rssUrl: string) => string;
}): void {
  rewriteDirectFetchUrl = options.rewriteDirectFetchUrl;
}

function decodeXmlEntities(s: string): string {
  let out = s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) =>
      String.fromCharCode(Number.parseInt(n, 10))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCharCode(Number.parseInt(h, 16))
    );
  out = out.replace(/\s+/g, " ").trim();
  return out;
}

function extractTagBlock(itemXml: string, tag: string): string {
  const cdata = new RegExp(
    `<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`,
    "i"
  );
  let m = itemXml.match(cdata);
  if (m?.[1] != null) return decodeXmlEntities(m[1].trim());
  const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  m = itemXml.match(plain);
  if (!m?.[1]) return "";
  const inner = m[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/<[^>]+>/g, " ")
    .trim();
  return decodeXmlEntities(inner);
}

/** Parse RSS 2.0 XML (handles CDATA, common in Burmese feeds). */
export function parseRssXml(xml: string): Array<{
  title: string;
  link: string;
  pubDate: string;
}> {
  const out: Array<{ title: string; link: string; pubDate: string }> = [];
  const re = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const block = m[1] ?? "";
    const title = extractTagBlock(block, "title");
    let link = extractTagBlock(block, "link");
    if (!link) {
      const guid = block.match(
        /<guid[^>]*isPermaLink\s*=\s*["']true["'][^>]*>([\s\S]*?)<\/guid>/i
      );
      if (guid?.[1]) link = decodeXmlEntities(guid[1].replace(/<[^>]+>/g, "").trim());
    }
    const pubDate = extractTagBlock(block, "pubDate");
    if (title && link) {
      out.push({ title, link, pubDate });
    }
  }
  return out;
}

type Rss2JsonItem = {
  title?: string;
  link?: string;
  pubDate?: string;
};

type Rss2JsonResponse = {
  status?: string;
  items?: Rss2JsonItem[];
};

function parseRss2Json(json: unknown): Array<{
  title: string;
  link: string;
  pubDate: string;
}> {
  const j = json as Rss2JsonResponse;
  if (j.status !== "ok" || !Array.isArray(j.items)) return [];
  const out: Array<{ title: string; link: string; pubDate: string }> = [];
  for (const it of j.items) {
    const title = typeof it.title === "string" ? it.title.trim() : "";
    const link = typeof it.link === "string" ? it.link.trim() : "";
    const pubDate = typeof it.pubDate === "string" ? it.pubDate : "";
    if (title && link) out.push({ title, link, pubDate });
  }
  return out;
}

async function fetchRowsViaRss2Json(
  rssUrl: string
): Promise<Array<{ title: string; link: string; pubDate: string }>> {
  try {
    const u = `${RSS2JSON_BASE}?rss_url=${encodeURIComponent(rssUrl)}`;
    const res = await fetch(u, {
      signal:
        typeof AbortSignal !== "undefined" &&
        typeof AbortSignal.timeout === "function"
          ? AbortSignal.timeout(18_000)
          : undefined,
    });
    if (!res.ok) return [];
    const data: unknown = await res.json();
    return parseRss2Json(data);
  } catch {
    return [];
  }
}

function fetchTimeoutSignal(ms: number): AbortSignal | undefined {
  if (
    typeof AbortSignal !== "undefined" &&
    typeof AbortSignal.timeout === "function"
  ) {
    return AbortSignal.timeout(ms);
  }
  return undefined;
}

async function fetchFeedRows(
  rssUrl: string,
  maxItems: number
): Promise<Array<{ title: string; link: string; pubDate: string }>> {
  const headers: HeadersInit = {
    Accept: "application/rss+xml, application/xml, text/xml, */*",
    "User-Agent": "Agriora/1.0 (+https://github.com/)",
  };
  const directUrl = rewriteDirectFetchUrl
    ? rewriteDirectFetchUrl(rssUrl)
    : rssUrl;
  try {
    const res = await fetch(directUrl, {
      headers,
      signal: fetchTimeoutSignal(22_000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const text = await res.text();
    if (!text.includes("<rss") || !text.includes("<item")) {
      throw new Error("Not RSS");
    }
    const rows = parseRssXml(text);
    if (rows.length === 0) throw new Error("Empty");
    return rows.slice(0, maxItems);
  } catch {
    const rows = await fetchRowsViaRss2Json(rssUrl);
    return rows.slice(0, maxItems);
  }
}

function parsePubDateMs(pubDate: string): number {
  const t = Date.parse(pubDate);
  if (!Number.isNaN(t)) return t;
  const alt = Date.parse(pubDate.replace(/-/g, "/"));
  return Number.isNaN(alt) ? 0 : alt;
}

export async function fetchHeadlinesFromSource(
  source: NewsFeedSource,
  maxItems = 12
): Promise<NewsHeadline[]> {
  const raw = await fetchFeedRows(source.rssUrl, maxItems);
  return raw.map((r) => ({
    title: r.title,
    link: r.link,
    pubDateMs: parsePubDateMs(r.pubDate),
    feedId: source.id,
    feedLabel: source.label,
    scope: source.scope,
    lang: source.lang,
  }));
}

export type NewsFilter = "all" | NewsFeedScope;

/** Load all configured feeds in parallel; dedupe by link; newest first. */
export async function loadAggregatedHeadlines(options?: {
  maxPerFeed?: number;
  filter?: NewsFilter;
  maxTotal?: number;
}): Promise<NewsHeadline[]> {
  const maxPerFeed = options?.maxPerFeed ?? 10;
  const maxTotal = options?.maxTotal ?? 48;
  const filter = options?.filter ?? "all";

  const sources =
    filter === "all"
      ? [...NEWS_FEED_SOURCES]
      : NEWS_FEED_SOURCES.filter((s) => s.scope === filter);

  const settled = await Promise.allSettled(
    sources.map((s) => fetchHeadlinesFromSource(s, maxPerFeed))
  );

  const byLink = new Map<string, NewsHeadline>();
  for (const r of settled) {
    if (r.status !== "fulfilled") continue;
    for (const h of r.value) {
      if (!byLink.has(h.link)) byLink.set(h.link, h);
    }
  }

  const list = [...byLink.values()].sort(
    (a, b) => b.pubDateMs - a.pubDateMs
  );
  return list.slice(0, maxTotal);
}

/** Feeds for ag prices: commodities, oil, logistics, policy, weather, Myanmar + region. */
const AG_MARKET_CONTEXT_SOURCE_IDS: readonly string[] = [
  "google-ag-commodities",
  "google-oil-energy",
  "google-transport-logistics",
  "google-myanmar-policy",
  "google-weather-ag",
  "google-myanmar",
  "google-seasia",
  "irrawaddy",
  "bbc-burmese",
  "mizzima-en",
];

const _TOPIC_OIL =
  /\b(oil|crude|brent|wti|diesel|petrol|gasoline|fuel|opec|energy)\b/i;
const _TOPIC_TRANSPORT =
  /\b(transport|logistics|shipping|freight|cargo|port|vessel|supply chain)\b/i;
const _TOPIC_GOV =
  /\b(government|ministry|policy|parliament|sanction|subsidy|tariff|regulation|export ban|import ban)\b/i;
const _TOPIC_AG =
  /\b(agriculture|farming|farm|crop|harvest|paddy|rice|wheat|grain|fertilizer|commodity|food security|inflation)\b/i;
const _TOPIC_WEATHER =
  /\b(weather|monsoon|rain|drought|flood|cyclone|typhoon|heatwave|climate|storm)\b/i;
const _TOPIC_MM =
  /\b(myanmar|burma|yangon|mandalay|asean)\b/i;
const _TOPIC_MARKET =
  /\b(price|prices|market|futures|wholesale|mandi|export|import)\b/i;
const _DIR_UP =
  /\b(rise|risen|raises|raising|surge|surges|jump|soar|gain|gains|higher|upward|increase|increases|climb|rally|spike)\b/i;
const _DIR_DOWN =
  /\b(fall|falls|fell|drop|drops|plunge|slide|slump|lower|downward|decrease|decline|crash|cut|cuts|ease|tumble)\b/i;

/**
 * Heuristic relevance for ag / commodity price modelling (English-heavy RSS).
 * Higher = more likely to move oil, logistics, policy, weather, or price direction.
 */
export function scoreAgMarketHeadlineRelevance(title: string): number {
  const t = title.trim();
  if (!t) return 0;
  let s = 0;
  if (_TOPIC_AG.test(t)) s += 5;
  if (_TOPIC_OIL.test(t)) s += 4;
  if (_TOPIC_WEATHER.test(t)) s += 4;
  if (_TOPIC_TRANSPORT.test(t)) s += 3;
  if (_TOPIC_GOV.test(t)) s += 3;
  if (_TOPIC_MM.test(t)) s += 2;
  if (_TOPIC_MARKET.test(t)) s += 2;
  if (_DIR_UP.test(t)) s += 1;
  if (_DIR_DOWN.test(t)) s += 1;
  return s;
}

function headlineWithinRecency(
  pubDateMs: number,
  recencyDays: number,
  nowMs: number
): boolean {
  if (!pubDateMs || pubDateMs <= 0) return true;
  return pubDateMs >= nowMs - recencyDays * 86_400_000;
}

export type AgMarketNewsContextOptions = {
  maxTitles?: number;
  maxChars?: number;
  /** Only headlines from the last N calendar days (unknown pubDate kept). */
  recencyDays?: number;
  maxItemsPerFeed?: number;
};

/**
 * Ranked RSS titles for the ML pipeline: policy, oil, logistics, weather, ag, Myanmar.
 * Prefers the last `recencyDays` (default 3); falls back to broader pool if too few matches.
 */
export async function fetchAgMarketNewsContext(
  options?: AgMarketNewsContextOptions
): Promise<string> {
  const maxTitles = options?.maxTitles ?? 18;
  const maxChars = options?.maxChars ?? 4500;
  const recencyDays = options?.recencyDays ?? 3;
  const maxItemsPerFeed = options?.maxItemsPerFeed ?? 8;

  const sources = NEWS_FEED_SOURCES.filter((s) =>
    AG_MARKET_CONTEXT_SOURCE_IDS.includes(s.id)
  );
  const settled = await Promise.allSettled(
    sources.map((s) => fetchHeadlinesFromSource(s, maxItemsPerFeed))
  );
  const rows: NewsHeadline[] = [];
  for (const r of settled) {
    if (r.status !== "fulfilled") continue;
    rows.push(...r.value);
  }

  const nowMs = Date.now();
  const inWindow = rows.filter((h) =>
    headlineWithinRecency(h.pubDateMs, recencyDays, nowMs)
  );
  const pool = inWindow.length >= 6 ? inWindow : rows;

  const scored = pool.map((h) => ({
    h,
    score: scoreAgMarketHeadlineRelevance(h.title),
  }));
  let use = scored.filter((x) => x.score >= 5);
  if (use.length < 6) use = scored.filter((x) => x.score >= 3);
  if (use.length < 4) use = scored.filter((x) => x.score >= 1);
  if (use.length < 3) use = scored;

  use.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.h.pubDateMs - a.h.pubDateMs;
  });

  const seen = new Set<string>();
  const uniq: string[] = [];
  for (const { h } of use) {
    const t = h.title.replace(/\s+/g, " ").trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(t);
    if (uniq.length >= maxTitles) break;
  }
  const text = uniq.join(". ");
  return text.length <= maxChars ? text : `${text.slice(0, maxChars - 1)}…`;
}

/**
 * @deprecated Prefer {@link fetchAgMarketNewsContext}; kept for call-site compatibility.
 */
export async function fetchRiceMarketNewsContext(
  maxTitles = 18,
  maxChars = 4500
): Promise<string> {
  return fetchAgMarketNewsContext({ maxTitles, maxChars, recencyDays: 3 });
}

/**
 * Split ag-market context output (titles joined with ". ") into lines for UI.
 */
export function riceNewsContextToLines(text: string, maxLines = 8): string[] {
  if (!text.trim()) return [];
  return text
    .split(". ")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, maxLines);
}
