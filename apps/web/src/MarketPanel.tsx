import {
  MYANMAR_PLACES,
  type CurrentWeatherSnapshot,
  type MarketItem,
  type Verdict,
  fetchCurrentWeather,
  findNearestPlace,
  latestMidpoint,
  predictItemPrice,
  searchMarketItems,
  verdictLabelForLocale,
  weatherCodeLabelLocale,
} from "@agriora/core";
import { useMemo, useState } from "react";
import { BROWSER_GEO_OPTIONS, canUseBrowserGeolocation } from "./browserGeo";
import { IconCity, IconLocationPin, IconMarket } from "./icons";
import { useI18n } from "./LocaleContext";

function formatMmks(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    n
  );
}

export function MarketPanel() {
  const { locale, t } = useI18n();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<MarketItem | null>(null);
  const [news, setNews] = useState("");
  const [weatherSnap, setWeatherSnap] = useState<CurrentWeatherSnapshot | null>(
    null
  );
  const [weatherLabel, setWeatherLabel] = useState<string | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  const wl = locale === "my" ? "my" : "en";

  const filtered = useMemo(
    () => searchMarketItems(query).slice(0, 80),
    [query]
  );

  const prediction =
    selected &&
    predictItemPrice(selected, {
      newsText: news.trim() || undefined,
      weatherCode: weatherSnap?.weatherCode,
      temperatureC: weatherSnap?.temperatureC,
    });

  async function loadYangonWeather() {
    const y = MYANMAR_PLACES[0]!;
    setWeatherLoading(true);
    setWeatherLabel(null);
    try {
      const w = await fetchCurrentWeather(y.latitude, y.longitude);
      setWeatherSnap(w);
      const cond = weatherCodeLabelLocale(w.weatherCode, wl);
      setWeatherLabel(`${y.label} (${cond}, ${w.temperatureC}°C)`);
    } catch (e) {
      setWeatherSnap(null);
      setWeatherLabel(
        e instanceof Error ? e.message : t("errors.weatherLoad")
      );
    } finally {
      setWeatherLoading(false);
    }
  }

  function handleMyLocationWeather() {
    if (!canUseBrowserGeolocation()) {
      setWeatherLabel(
        navigator.geolocation
          ? t("errors.geoNeedHttps")
          : t("errors.geoUnsupported")
      );
      return;
    }
    setWeatherLoading(true);
    setWeatherLabel(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const w = await fetchCurrentWeather(latitude, longitude);
          const near = findNearestPlace(latitude, longitude);
          setWeatherSnap(w);
          const cond = weatherCodeLabelLocale(w.weatherCode, wl);
          setWeatherLabel(
            `${t("weather.nearestListed")}: ${near.label} (${cond}, ${w.temperatureC}°C)`
          );
        } catch (e) {
          setWeatherSnap(null);
          setWeatherLabel(
            e instanceof Error ? e.message : t("errors.weatherLoad")
          );
        } finally {
          setWeatherLoading(false);
        }
      },
      (err) => {
        setWeatherLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setWeatherLabel(t("errors.geoDenied"));
        } else if (err.code === err.TIMEOUT) {
          setWeatherLabel(t("errors.locationTimeout"));
        } else {
          setWeatherLabel(err.message || t("errors.locationTimeout"));
        }
      },
      BROWSER_GEO_OPTIONS
    );
  }

  const marketHint = t("market.hint");

  return (
    <div className="panel market-panel">
      <div className="page-title-row">
        <IconMarket className="panel-icon" aria-hidden />
        <h2 className="page-title">{t("market.title")}</h2>
      </div>
      {marketHint.trim() ? <p className="hint">{marketHint}</p> : null}

      <input
        type="search"
        className="input-search"
        placeholder={t("market.searchPlaceholder")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label={t("market.searchAria")}
      />

      <ul className="market-list" role="listbox" aria-label={t("market.itemsAria")}>
        {filtered.map((it) => (
          <li key={it.id}>
            <button
              type="button"
              className={
                selected?.id === it.id ? "market-row active" : "market-row"
              }
              onClick={() => setSelected(it)}
            >
              <span className="market-row-title">{it.itemDetails}</span>
              {latestMidpoint(it) != null && (
                <span className="market-row-meta">
                  ~{formatMmks(latestMidpoint(it)!)}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <div className="card market-detail">
          <p className="result-label">{t("market.selected")}</p>
          <p className="market-detail-title">{selected.itemDetails}</p>
          <p className="meta market-breadcrumb">
            {[selected.group, selected.mainCategory, selected.itemCategory]
              .filter(Boolean)
              .join(" · ")}
          </p>

          <div className="weather-actions">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={weatherLoading}
              onClick={() => void loadYangonWeather()}
            >
              <IconCity className="chip-icon" aria-hidden />
              {weatherLoading ? t("market.loading") : t("market.yangonWeather")}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={weatherLoading}
              onClick={handleMyLocationWeather}
            >
              <IconLocationPin className="chip-icon" aria-hidden />
              {t("market.myLocation")}
            </button>
          </div>
          {weatherLabel && <p className="hint tight">{weatherLabel}</p>}

          <p className="hint tight">{t("market.optionalNews")}</p>
          <textarea
            className="textarea"
            rows={4}
            placeholder={t("market.newsPlaceholder")}
            value={news}
            onChange={(e) => setNews(e.target.value)}
          />

          {prediction && (
            <div className="prediction-block">
              <p className="result-label">{t("market.demoForecast")}</p>
              <p className="prediction-mid">
                {formatMmks(prediction.predictedMid)} {t("common.mmk")}
              </p>
              <p className="meta">
                {t("market.range")} {formatMmks(prediction.predictedLow)} –{" "}
                {formatMmks(prediction.predictedHigh)} ·{" "}
                {t("market.baselineMid")}{" "}
                {formatMmks(prediction.baselineMid)} (
                {prediction.baselineDateIso ?? "—"})
              </p>
              <ul className="factor-list">
                <li>
                  {t("market.factorTrend")} ×
                  {prediction.factors.trend.toFixed(4)}
                </li>
                <li>
                  {t("market.factorNews")} ×
                  {prediction.factors.news.toFixed(4)} (
                  {verdictLabelForLocale(
                    locale,
                    prediction.factors.newsVerdict as Verdict
                  )}
                  )
                </li>
                <li>
                  {t("market.factorWeather")} ×
                  {prediction.factors.weather.toFixed(4)} —{" "}
                  {prediction.factors.weatherNote}
                </li>
              </ul>
              <p className="disclaimer">{t("market.predictionDisclaimer")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
