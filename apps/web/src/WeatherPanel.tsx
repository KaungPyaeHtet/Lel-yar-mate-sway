import {
  MYANMAR_PLACES,
  type CurrentWeatherSnapshot,
  type MyanmarPlace,
  fetchCurrentWeather,
  findNearestPlace,
  weatherCodeLabelLocale,
} from "@agriora/core";
import { useCallback, useEffect, useState } from "react";
import { BROWSER_GEO_OPTIONS, canUseBrowserGeolocation } from "./browserGeo";
import { IconLocationPin, IconRefresh, IconWeather } from "./icons";
import { useI18n } from "./LocaleContext";

type Row = {
  place: MyanmarPlace;
  weather?: CurrentWeatherSnapshot;
  error?: string;
};

type LocCard = {
  lat: number;
  lon: number;
  weather: CurrentWeatherSnapshot;
  nearest: MyanmarPlace;
};

export function WeatherPanel({ isActive }: { isActive: boolean }) {
  const { locale, t } = useI18n();
  const wl = locale === "my" ? "my" : "en";
  const [rows, setRows] = useState<Row[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [locCard, setLocCard] = useState<LocCard | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locMsg, setLocMsg] = useState<string | null>(null);

  const loadAllRegions = useCallback(async () => {
    setLoadingList(true);
    setRows(MYANMAR_PLACES.map((place) => ({ place })));
    const settled = await Promise.allSettled(
      MYANMAR_PLACES.map((p) =>
        fetchCurrentWeather(p.latitude, p.longitude)
      )
    );
    setRows(
      MYANMAR_PLACES.map((place, i) => {
        const r = settled[i];
        if (r.status === "fulfilled") {
          return { place, weather: r.value };
        }
        return {
          place,
          error:
            r.reason instanceof Error
              ? r.reason.message
              : t("weather.failed"),
        };
      })
    );
    setLoadingList(false);
  }, [t]);

  useEffect(() => {
    if (isActive && rows.length === 0 && !loadingList) {
      void loadAllRegions();
    }
  }, [isActive, rows.length, loadingList, loadAllRegions]);

  function handleMyLocation() {
    if (!canUseBrowserGeolocation()) {
      setLocMsg(
        navigator.geolocation
          ? t("errors.geoNeedHttps")
          : t("errors.geoUnsupported")
      );
      return;
    }
    setLocLoading(true);
    setLocMsg(null);
    setLocCard(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const weather = await fetchCurrentWeather(latitude, longitude);
          const nearest = findNearestPlace(latitude, longitude);
          setLocCard({ lat: latitude, lon: longitude, weather, nearest });
        } catch (e) {
          setLocMsg(
            e instanceof Error ? e.message : t("errors.weatherLoad")
          );
        } finally {
          setLocLoading(false);
        }
      },
      (err) => {
        setLocLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocMsg(t("errors.geoDenied"));
        } else if (err.code === err.TIMEOUT) {
          setLocMsg(t("errors.locationTimeout"));
        } else {
          setLocMsg(err.message || t("errors.locationTimeout"));
        }
      },
      BROWSER_GEO_OPTIONS
    );
  }

  return (
    <div className="panel weather-panel">
      <div className="page-title-row">
        <IconWeather className="panel-icon" aria-hidden />
        <h2 className="page-title">{t("weather.title")}</h2>
      </div>
      <p className="hint">
        {t("weather.hintWeb")}{" "}
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noreferrer"
          className="inline-link"
        >
          {t("weather.openMeteo")}
        </a>
        .
      </p>

      <button
        type="button"
        className="btn"
        onClick={handleMyLocation}
        disabled={locLoading}
      >
        <IconLocationPin className="chip-icon" aria-hidden />
        {locLoading
          ? t("weather.gettingLocation")
          : t("weather.useLocation")}
      </button>

      {locMsg && <p className="weather-msg">{locMsg}</p>}

      {locCard && (
        <div className="card weather-loc-card">
          <p className="weather-loc-label">{t("weather.nearYou")}</p>
          <p className="weather-big-temp">
            {Math.round(locCard.weather.temperatureC)}°C
          </p>
          <p className="weather-cond">
            {weatherCodeLabelLocale(locCard.weather.weatherCode, wl)}
          </p>
          <p className="meta">
            {t("weather.nearestListed")}: {locCard.nearest.label} (
            {locCard.nearest.region})
          </p>
          <p className="meta weather-sub">
            {locCard.weather.humidityPct != null
              ? `${t("weather.humidity")} ${locCard.weather.humidityPct}% · `
              : ""}
            {locCard.weather.windKmh != null
              ? `${t("weather.wind")} ${Math.round(locCard.weather.windKmh)} km/h`
              : ""}
          </p>
        </div>
      )}

      <div className="weather-section-head">
        <h3 className="section-title">{t("weather.allRegions")}</h3>
        <button
          type="button"
          className="link-btn"
          onClick={() => void loadAllRegions()}
          disabled={loadingList}
        >
          <IconRefresh className="chip-icon" aria-hidden />
          {t("weather.refresh")}
        </button>
      </div>

      {loadingList && rows.length === 0 && (
        <p className="hint">{t("weather.loadingForecasts")}</p>
      )}

      <ul className="weather-list">
        {rows.map(({ place, weather, error }) => (
          <li key={place.id} className="card weather-row">
            <div className="weather-row-head">
              <span className="weather-place">{place.label}</span>
              <span className="weather-region">{place.region}</span>
            </div>
            {weather ? (
              <p className="weather-line">
                {Math.round(weather.temperatureC)}°C ·{" "}
                {weatherCodeLabelLocale(weather.weatherCode, wl)}
                <span className="weather-sub">
                  {weather.humidityPct != null
                    ? ` · ${weather.humidityPct}%`
                    : ""}
                  {weather.windKmh != null
                    ? ` · ${Math.round(weather.windKmh)} km/h`
                    : ""}
                </span>
              </p>
            ) : error ? (
              <p className="weather-err">{error}</p>
            ) : (
              <p className="hint">…</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
