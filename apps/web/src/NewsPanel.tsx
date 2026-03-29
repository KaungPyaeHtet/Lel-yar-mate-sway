import {
  loadAggregatedHeadlines,
  type NewsFilter,
  type NewsHeadline,
} from "@agriora/core";
import { useCallback, useEffect, useState } from "react";
import {
  IconAirplane,
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
  const { locale, t } = useI18n();
  const [filter, setFilter] = useState<NewsFilter>("all");
  const [headlines, setHeadlines] = useState<NewsHeadline[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
          </li>
        ))}
      </ul>
    </div>
  );
}
