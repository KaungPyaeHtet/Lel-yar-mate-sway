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
  formatSignedPercent,
  getMlApiBaseUrl,
  getPrimaryRiceMarketItem,
  midPriceMomentumPct,
  predictItemPrice,
  rainfallMmHintFromWeatherCode,
  recentMidPricesForMl,
  riceMidSeriesForChart,
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

function formatSentimentScore(n: number): string {
  if (Number.isNaN(n)) return "—";
  return n >= 0 ? `+${n.toFixed(2)}` : n.toFixed(2);
}

function screenNewsVerdict(
  v: string | undefined
): "up" | "down" | "flat" {
  if (v === "up" || v === "down" || v === "flat") return v;
  return "flat";
}

function MlAdviceRationale({
  locale,
  t,
  tf,
  detail,
  newsLines,
  weatherSnap,
  screenVerdictLabel,
  usedPlaceholderNews,
}: {
  locale: AppLocale;
  t: (k: AppStringKey) => string;
  tf: (k: AppStringKey, vars: Record<string, string | number>) => string;
  detail: MlNextDayDetail;
  newsLines: string[];
  weatherSnap: CurrentWeatherSnapshot;
  screenVerdictLabel: string;
  usedPlaceholderNews: boolean;
}) {
  const confPct = Math.round(detail.confidenceHint * 100);
  const cond = weatherCodeLabelLocale(weatherSnap.weatherCode, locale);

  return (
    <div className="ml-advice-rationale">
      <p>
        {tf("market.adviceDetailsModelMove", {
          pct: formatSignedPercent(detail.nextDayPctChange),
        })}
      </p>
      <p>
        {tf("market.adviceDetailsSignal", { pct: confPct })}
      </p>
      <p>{t("market.adviceDetailsSignalNote")}</p>
      <p>
        {tf("market.adviceDetailsSentiment", {
          score: formatSentimentScore(detail.sentimentScore),
        })}
      </p>
      <p>{t("market.adviceDetailsSentimentHint")}</p>
      <p className="ml-rationale-label">{t("market.adviceDetailsNewsLabel")}</p>
      {usedPlaceholderNews ? (
        <p>{t("market.adviceDetailsPlaceholderNews")}</p>
      ) : null}
      {newsLines.length > 0 ? (
        <ul>
          {newsLines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      ) : usedPlaceholderNews ? null : (
        <p>{t("market.adviceDetailsPlaceholderNews")}</p>
      )}
      <p>
        {tf("market.adviceDetailsWeather", {
          temp: Math.round(weatherSnap.temperatureC * 10) / 10,
          condition: cond,
          rain: detail.rainfallMm,
        })}
      </p>
      <p>
        {tf("market.adviceDetailsPattern", {
          d1: formatSignedPercent(detail.priceChange1dPct),
          d7: formatSignedPercent(detail.priceChange7dPct),
        })}
      </p>
      <p>
        {tf("market.adviceDetailsScreenRule", { verdict: screenVerdictLabel })}
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
  const selected = useMemo(() => getPrimaryRiceMarketItem(), []);
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
    const prices = recentMidPricesForMl(selected, 8);
    if (!prices) {
      setMlErr(t("market.mlBackendNeedHistory"));
      return;
    }
    const runId = ++mlRunRef.current;
    setMlLoading(true);
    setMlErr(null);
    setMlDetail(null);
    const headline =
      newsAuto.trim() || ML_HEADLINE_FALLBACK;
    const momentum = midPriceMomentumPct(prices);
    const rainMm = rainfallMmHintFromWeatherCode(weatherSnap.weatherCode);
    fetchMlNextDayDetail({
      avgPrices: prices,
      rainfallMm: rainMm,
      tempC: weatherSnap.temperatureC,
      newsHeadline: headline.slice(0, 4000),
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

  return (
    <div className="panel market-panel">
      <div className="page-title-row">
        <IconMarket className="panel-icon" aria-hidden />
        <h2 className="page-title">{t("market.title")}</h2>
      </div>

      <div className="card market-detail">
        <p className="result-label">{t("market.selected")}</p>
        <p className="market-detail-title">{selected.itemDetails}</p>
        <p className="meta market-breadcrumb">
          {[selected.group, selected.mainCategory, selected.itemCategory]
            .filter(Boolean)
            .join(" · ")}
        </p>

        <p className="result-label">{t("market.chartTitle")}</p>
        <PriceHistoryChart series={chartSeries} locale={locale} />

        {prediction && (
          <div className="prediction-block">
            <p className="result-label">{t("market.forecastPriceTitle")}</p>
            <p className="prediction-mid">
              {formatMmks(prediction.predictedMid)} {t("common.mmk")}
            </p>
            <p className="disclaimer">{t("market.predictionDisclaimer")}</p>
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
                  mlDetail.nextDayPctChange
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
                      newsLines={newsLines}
                      weatherSnap={weatherSnap}
                      screenVerdictLabel={screenVerdictLabel}
                      usedPlaceholderNews={usedPlaceholderNews}
                    />
                  </details>
                );
              })() : null}
              {mlDetail != null && (
                <p className="hint tight ml-advice-disclaimer">
                  {t("market.adviceDisclaimer")}
                </p>
              )}
            </>
          ) : (
            <p className="hint tight">{t("market.mlBackendNoUrl")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
