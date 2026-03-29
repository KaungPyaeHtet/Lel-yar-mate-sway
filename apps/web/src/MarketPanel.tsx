import {
  MYANMAR_PLACES,
  type AppLocale,
  type AppStringKey,
  type CurrentWeatherSnapshot,
  type MlNextDayDetail,
  adviceFromMlNextDayPct,
  fetchCurrentWeather,
  fetchMlNextDayDetail,
  fetchRiceMarketNewsContext,
  forecastKyatFromMlPct,
  formatLongDateLabel,
  formatSignedPercent,
  getDefaultMarketItemForUi,
  getMarketItemById,
  initialMarketTabItemId,
  MARKET_ITEMS,
  mlNewsHeadlineForItem,
  getMlApiBaseUrl,
  midPriceMomentumPct,
  observationMidsOldestToNewest,
  predictItemPrice,
  rainfallMmHintFromWeatherCode,
  recentMidPricesForInference,
  riceMidSeriesForChart,
  searchMarketItems,
  shortMarketItemLabelForUi,
  riceNewsContextToLines,
  verdictLabelForLocale,
  weatherCodeLabelLocale,
} from "@agriora/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { BROWSER_GEO_OPTIONS, canUseBrowserGeolocation } from "./browserGeo";
import { IconMarket } from "./icons";
import { useI18n } from "./LocaleContext";
import { PriceHistoryChart } from "./PriceHistoryChart";

const ML_HEADLINE_FALLBACK =
  "Rice and commodity markets Myanmar Southeast Asia.";

function screenNewsVerdict(
  v: string | undefined
): "up" | "down" | "flat" {
  if (v === "up" || v === "down" || v === "flat") return v;
  return "flat";
}

function adviceStrengthWord(
  confPct: number,
  t: (k: AppStringKey) => string
): string {
  if (confPct < 40) return t("market.adviceStrengthSoft");
  if (confPct < 68) return t("market.adviceStrengthMid");
  return t("market.adviceStrengthFirm");
}

const ADVICE_HEADLINES_SHOWN = 3;

function MlAdviceRationale({
  locale,
  t,
  tf,
  detail,
  itemLabel,
  newsLines,
  weatherSnap,
  screenVerdictLabel,
  usedPlaceholderNews,
}: {
  locale: AppLocale;
  t: (k: AppStringKey) => string;
  tf: (k: AppStringKey, vars: Record<string, string | number>) => string;
  detail: MlNextDayDetail;
  itemLabel: string;
  newsLines: string[];
  weatherSnap: CurrentWeatherSnapshot;
  screenVerdictLabel: string;
  usedPlaceholderNews: boolean;
}) {
  const confPct = Math.round(detail.confidenceHint * 100);
  const cond = weatherCodeLabelLocale(weatherSnap.weatherCode, locale);
  const strength = adviceStrengthWord(confPct, t);
  const showHeadlines = newsLines.slice(0, ADVICE_HEADLINES_SHOWN);
  const moreHeadlines = newsLines.length - showHeadlines.length;

  return (
    <div className="ml-advice-rationale">
      <p>
        {tf("market.adviceWhySummary", {
          item: itemLabel,
          pct: formatSignedPercent(detail.nextDayPctChange),
          strength,
        })}
      </p>
      {usedPlaceholderNews ? (
        <p>{t("market.adviceDetailsPlaceholderNews")}</p>
      ) : null}
      {!usedPlaceholderNews && newsLines.length > 0 ? (
        <>
          <p className="ml-rationale-label">{t("market.adviceWhyHeadlines")}</p>
          <ul>
            {showHeadlines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
          {moreHeadlines > 0 ? (
            <p className="ml-advice-rationale-more">
              {tf("market.adviceWhyHeadlinesMore", { n: moreHeadlines })}
            </p>
          ) : null}
        </>
      ) : !usedPlaceholderNews ? (
        <p>{t("market.adviceDetailsPlaceholderNews")}</p>
      ) : null}
      <p>
        {tf("market.adviceWhyWeather", {
          temp: Math.round(weatherSnap.temperatureC * 10) / 10,
          condition: cond,
        })}
      </p>
      <p>
        {tf("market.adviceWhyTrend", {
          d1: formatSignedPercent(detail.priceChange1dPct),
          d7: formatSignedPercent(detail.priceChange7dPct),
        })}
      </p>
      <p>
        {tf("market.adviceWhySimpleRead", { verdict: screenVerdictLabel })}
      </p>
    </div>
  );
}

function formatMmks(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    n
  );
}

export function MarketPanel() {
  const { locale, t, tf } = useI18n();
  const [itemId, setItemId] = useState(() => initialMarketTabItemId());
  const [itemFilter, setItemFilter] = useState("");
  const selected = useMemo(
    () => getMarketItemById(itemId) ?? getDefaultMarketItemForUi(),
    [itemId]
  );
  const { shownItems, allMatching } = useMemo(() => {
    const all = itemFilter.trim()
      ? searchMarketItems(itemFilter)
      : [...MARKET_ITEMS];
    return { allMatching: all, shownItems: all.slice(0, 120) };
  }, [itemFilter]);
  const [newsAuto, setNewsAuto] = useState("");
  const [newsLoading, setNewsLoading] = useState(true);
  const [weatherSnap, setWeatherSnap] = useState<CurrentWeatherSnapshot | null>(
    null
  );
  const [mlDetail, setMlDetail] = useState<MlNextDayDetail | null>(null);
  const [mlErr, setMlErr] = useState<string | null>(null);
  const [mlLoading, setMlLoading] = useState(false);

  const mlBase = getMlApiBaseUrl();
  const mlRunRef = useRef(0);

  const chartSeries = useMemo(
    () => riceMidSeriesForChart(selected),
    [selected]
  );

  const prediction = predictItemPrice(selected, {
    newsText: newsAuto.trim() || undefined,
    weatherCode: weatherSnap?.weatherCode,
    temperatureC: weatherSnap?.temperatureC,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setNewsLoading(true);
      try {
        const text = await fetchRiceMarketNewsContext();
        if (!cancelled) setNewsAuto(text);
      } catch {
        /* keep empty; model still runs */
      } finally {
        if (!cancelled) setNewsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadWeather() {
      const applyYangon = async () => {
        const y = MYANMAR_PLACES[0]!;
        const w = await fetchCurrentWeather(y.latitude, y.longitude);
        if (!cancelled) setWeatherSnap(w);
      };
      try {
        if (canUseBrowserGeolocation() && navigator.geolocation) {
          const pos = await new Promise<GeolocationPosition>(
            (resolve, reject) => {
              navigator.geolocation.getCurrentPosition(
                resolve,
                reject,
                BROWSER_GEO_OPTIONS
              );
            }
          );
          const { latitude, longitude } = pos.coords;
          const w = await fetchCurrentWeather(latitude, longitude);
          if (!cancelled) setWeatherSnap(w);
        } else {
          await applyYangon();
        }
      } catch {
        if (!cancelled) await applyYangon();
      }
    }
    void loadWeather();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mlBase || !weatherSnap || newsLoading) return;
    const prices = recentMidPricesForInference(selected, 8);
    if (!prices) {
      setMlErr(t("market.mlBackendNeedHistory"));
      return;
    }
    const runId = ++mlRunRef.current;
    setMlLoading(true);
    setMlErr(null);
    setMlDetail(null);
    const headline = mlNewsHeadlineForItem(
      newsAuto.trim() || ML_HEADLINE_FALLBACK,
      selected
    );
    const rawMids = observationMidsOldestToNewest(selected);
    const momentum =
      rawMids.length >= 8
        ? midPriceMomentumPct(rawMids.slice(-8))
        : null;
    const rainMm = rainfallMmHintFromWeatherCode(weatherSnap.weatherCode);
    fetchMlNextDayDetail({
      avgPrices: prices,
      rainfallMm: rainMm,
      tempC: weatherSnap.temperatureC,
      newsHeadline: headline,
      fallbackMomentum: momentum,
    })
      .then((d) => {
        if (mlRunRef.current === runId) setMlDetail(d);
      })
      .catch((e) => {
        if (mlRunRef.current === runId) {
          setMlErr(
            e instanceof Error ? e.message : t("errors.mlBackend")
          );
        }
      })
      .finally(() => {
        if (mlRunRef.current === runId) setMlLoading(false);
      });
  }, [mlBase, selected, weatherSnap, newsAuto, newsLoading, t]);

  const newsLines = useMemo(
    () => riceNewsContextToLines(newsAuto, 8),
    [newsAuto]
  );
  const usedPlaceholderNews = !newsAuto.trim();
  const screenVerdictLabel = verdictLabelForLocale(
    locale,
    screenNewsVerdict(prediction?.factors.newsVerdict)
  );

  const latestDateIso = useMemo(() => {
    if (chartSeries.length > 0) {
      return chartSeries[chartSeries.length - 1]!.dateIso;
    }
    return prediction?.baselineDateIso ?? null;
  }, [chartSeries, prediction]);

  const latestDateLabel = useMemo(() => {
    if (!latestDateIso) return null;
    return formatLongDateLabel(latestDateIso, locale);
  }, [latestDateIso, locale]);

  const mlForecastKyat =
    prediction && mlDetail
      ? forecastKyatFromMlPct(
          prediction.baselineMid,
          mlDetail.nextDayPctChange,
          prediction.baselineLow,
          prediction.baselineHigh
        )
      : null;

  const displayForecastMid =
    mlForecastKyat?.mid ?? prediction?.predictedMid ?? null;

  const adviceItemLabel = useMemo(
    () => shortMarketItemLabelForUi(selected),
    [selected]
  );

  return (
    <div className="panel market-panel">
      <div className="page-title-row">
        <IconMarket className="panel-icon" aria-hidden />
        <h2 className="page-title">{t("market.title")}</h2>
      </div>
      <div className="card market-detail">
        <p className="result-label">{t("market.chooseItem")}</p>
        <input
          className="input-search"
          type="search"
          placeholder={t("market.itemFilterPlaceholder")}
          aria-label={t("market.searchAria")}
          value={itemFilter}
          onChange={(e) => setItemFilter(e.target.value)}
        />
        <p className="meta market-date-caption">
          {tf("market.itemListHint", {
            shown: shownItems.length,
            total: allMatching.length,
          })}
        </p>
        {allMatching.length > shownItems.length ? (
          <p className="meta market-date-caption">{t("market.itemListCap")}</p>
        ) : null}
        <ul className="market-list" aria-label={t("market.itemsAria")}>
          {shownItems.map((it) => (
            <li key={it.id}>
              <button
                type="button"
                className={`market-row ${it.id === itemId ? "active" : ""}`}
                onClick={() => setItemId(it.id)}
              >
                <span className="market-row-title">{it.itemDetails}</span>
                <span className="market-row-meta">{it.itemCategory}</span>
              </button>
            </li>
          ))}
        </ul>

        <p className="result-label">{t("market.selected")}</p>
        <p className="market-detail-title">{selected.itemDetails}</p>
        <p className="meta market-breadcrumb">
          {[selected.group, selected.mainCategory, selected.itemCategory]
            .filter(Boolean)
            .join(" · ")}
        </p>

        <p className="result-label">{t("market.chartTitle")}</p>
        {latestDateLabel ? (
          <p className="meta market-date-caption">
            {tf("market.chartDataThrough", { date: latestDateLabel })}
          </p>
        ) : null}
        <PriceHistoryChart series={chartSeries} locale={locale} />

        {displayForecastMid != null && prediction && (
          <div className="prediction-block">
            <p className="result-label">{t("market.forecastPriceTitle")}</p>
            <p className="prediction-mid">
              {formatMmks(displayForecastMid)} {t("common.mmk")}
            </p>
            <p className="meta market-date-caption">
              {mlDetail != null
                ? tf("market.forecastConfidenceMl", {
                    pct: Math.round(mlDetail.confidenceHint * 100),
                  })
                : mlBase && mlLoading
                  ? t("market.forecastConfidenceLoading")
                  : t("market.forecastConfidenceNoMl")}
            </p>
          </div>
        )}

        <div className="ml-backend-block">
          <p className="result-label">{t("market.adviceTitle")}</p>
          {mlBase ? (
            <>
              {mlLoading && (
                <p className="meta">{t("market.mlBackendLoading")}</p>
              )}
              {mlErr && <p className="weather-msg">{mlErr}</p>}
              {mlDetail != null && weatherSnap ? (() => {
                const advice = adviceFromMlNextDayPct(
                  mlDetail.nextDayPctChange,
                  { priceChange7dPct: mlDetail.priceChange7dPct }
                );
                const glyph =
                  advice === "hold" ? "▲" : advice === "sell" ? "✕" : "—";
                const titleKey =
                  advice === "hold"
                    ? "market.adviceHold"
                    : advice === "sell"
                      ? "market.adviceSell"
                      : "market.adviceNeutral";
                const subKey =
                  advice === "hold"
                    ? "market.adviceHoldSub"
                    : advice === "sell"
                      ? "market.adviceSellSub"
                      : "market.adviceNeutralSub";
                return (
                  <details
                    className={`ml-advice-details ml-advice--${advice}`}
                  >
                    <summary
                      className={`ml-advice ml-advice--${advice}`}
                      aria-label={t("market.adviceDetailsToggle")}
                    >
                      <span className="ml-advice__glyph" aria-hidden>
                        {glyph}
                      </span>
                      <div className="ml-advice__text">
                        <p className="ml-advice__title">{t(titleKey)}</p>
                        <p className="ml-advice__sub">{t(subKey)}</p>
                        <span className="ml-advice__hint">
                          {t("market.adviceDetailsToggle")}
                        </span>
                      </div>
                    </summary>
                    <MlAdviceRationale
                      locale={locale}
                      t={t}
                      tf={tf}
                      detail={mlDetail}
                      itemLabel={adviceItemLabel}
                      newsLines={newsLines}
                      weatherSnap={weatherSnap}
                      screenVerdictLabel={screenVerdictLabel}
                      usedPlaceholderNews={usedPlaceholderNews}
                    />
                  </details>
                );
              })() : null}
            </>
          ) : (
            <p className="hint tight">{t("market.mlBackendNoUrl")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
