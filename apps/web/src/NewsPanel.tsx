import {
  analyzeWithRules,
  loadAggregatedHeadlines,
  verdictLabelForLocale,
  type NewsFilter,
  type NewsHeadline,
  type Verdict,
} from "@agriora/core";
import { useCallback, useEffect, useState } from "react";
import {
  IconAirplane,
  IconChart,
  IconFlagSimple,
  IconGlobeSimple,
  IconNews,
  IconRefresh,
} from "./icons";
import { useI18n } from "./LocaleContext";

function formatWhen(ms: number, locale: "my" | "en") {
  if (!ms) return "";
  try {
    const loc = locale === "my" ? "my-MM" : "en-GB";
    return new Intl.DateTimeFormat(loc, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ms));
  } catch {
    return "";
  }
}

export function NewsPanel({ isActive }: { isActive: boolean }) {
  const { locale, t, tf } = useI18n();
  const [filter, setFilter] = useState<NewsFilter>("all");
  const [headlines, setHeadlines] = useState<NewsHeadline[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [paragraph, setParagraph] = useState("");
  const [result, setResult] = useState<ReturnType<
    typeof analyzeWithRules
  > | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const h = await loadAggregatedHeadlines({
        filter,
        maxPerFeed: 10,
        maxTotal: 50,
      });
      setHeadlines(h);
    } catch (e) {
      setHeadlines([]);
      setErr(
        e instanceof Error ? e.message : t("errors.headlinesLoad")
      );
    } finally {
      setLoading(false);
    }
  }, [filter, t]);

  useEffect(() => {
    if (isActive) void load();
  }, [isActive, load]);

  const chips: {
    id: NewsFilter;
    key: "news.filterAll" | "news.filterMyanmar" | "news.filterIntl";
    Icon: typeof IconGlobeSimple;
  }[] = [
    { id: "all", key: "news.filterAll", Icon: IconGlobeSimple },
    { id: "myanmar", key: "news.filterMyanmar", Icon: IconFlagSimple },
    { id: "international", key: "news.filterIntl", Icon: IconAirplane },
  ];

  return (
    <div className="panel news-panel">
      <div className="page-title-row">
        <IconNews className="panel-icon" aria-hidden />
        <h2 className="page-title">{t("news.title")}</h2>
      </div>
      <p className="hint">{t("news.hint")}</p>

      <div
        className="chip-row"
        role="tablist"
        aria-label={t("news.filterAria")}
      >
        {chips.map(({ id, key, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            className={filter === id ? "chip active" : "chip"}
            aria-selected={filter === id}
            onClick={() => setFilter(id)}
          >
            <Icon className="chip-icon" aria-hidden />
            {t(key)}
          </button>
        ))}
      </div>

      <div className="news-toolbar">
        <button
          type="button"
          className="link-btn"
          disabled={loading}
          onClick={() => void load()}
        >
          <IconRefresh className="chip-icon" aria-hidden />
          {loading ? t("news.loadingHeadlines") : t("news.refresh")}
        </button>
      </div>

      {err && <p className="weather-msg">{err}</p>}

      <ul className="news-list" aria-busy={loading}>
        {headlines.map((h) => (
          <li key={h.link} className="news-item">
            <a
              className={
                h.lang === "my" ? "news-link news-link-my" : "news-link"
              }
              href={h.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              {h.title}
            </a>
            <p className="news-meta">
              <span className="news-source">{h.feedLabel}</span>
              {h.pubDateMs ? (
                <>
                  {" · "}
                  <time dateTime={new Date(h.pubDateMs).toISOString()}>
                    {formatWhen(h.pubDateMs, locale === "my" ? "my" : "en")}
                  </time>
                </>
              ) : null}
            </p>
            <button
              type="button"
              className="link-btn news-use"
              onClick={() => {
                setParagraph((p) =>
                  p.trim() ? `${p.trim()}\n\n${h.title}` : h.title
                );
              }}
            >
              {t("news.addToHint")}
            </button>
          </li>
        ))}
      </ul>

      <h3 className="subheading">{t("news.subheading")}</h3>
      <p className="hint">{t("news.hintPaste")}</p>
      <textarea
        className="textarea"
        placeholder={t("news.placeholder")}
        rows={8}
        value={paragraph}
        onChange={(e) => setParagraph(e.target.value)}
      />
      <button
        type="button"
        className="btn"
        onClick={() => setResult(analyzeWithRules(paragraph))}
      >
        <IconChart className="chip-icon" aria-hidden />
        {t("news.estimate")}
      </button>
      {result && result.rows.length > 0 && (
        <div className="card">
          <p className="result-label">{t("news.resultLabel")}</p>
          <p className={`result-main v-${result.verdict}`}>
            {verdictLabelForLocale(locale, result.verdict as Verdict)}
          </p>
          <p className="meta">
            {tf("news.blendMeta", {
              avg: result.avgBlend.toFixed(2),
              net: result.totalNet.toFixed(2),
              n: result.rows.length,
            })}
          </p>
          <ul className="rows">
            {result.rows.map((r, i) => (
              <li key={i}>
                {r.text.length > 100 ? r.text.slice(0, 100) + "…" : r.text}
                <span className="row-sub">
                  blend {r.blend.toFixed(2)} (rules {r.net.toFixed(2)})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {result && result.rows.length === 0 && (
        <p className="hint">{t("news.addSentence")}</p>
      )}
    </div>
  );
}
