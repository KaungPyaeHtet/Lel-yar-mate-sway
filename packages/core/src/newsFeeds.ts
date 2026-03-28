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
