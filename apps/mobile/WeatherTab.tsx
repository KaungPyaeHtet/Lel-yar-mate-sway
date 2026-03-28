import {
  MYANMAR_PLACES,
  type CurrentWeatherSnapshot,
  type MyanmarPlace,
  fetchCurrentWeather,
  findNearestPlace,
  weatherCodeLabelLocale,
} from "@agriora/core";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useI18n } from "./LocaleContext";
import { resolveCoordsForWeather } from "./weatherLocation";

const bg = "#0c120f";
const fg = "#e6ede8";
const muted = "rgba(230, 237, 232, 0.55)";
const accent = "#5cb87a";
const surface = "#141c17";

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

export function WeatherTab({ isActive }: { isActive: boolean }) {
  const { locale, t } = useI18n();
  const wl = locale === "my" ? "my" : "en";
  const [rows, setRows] = useState<Row[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [locCard, setLocCard] = useState<LocCard | null>(null);
  const [locLoading, setLocLoading] = useState(false);

  const loadAllRegions = useCallback(async () => {
    setLoadingList(true);
    const next: Row[] = MYANMAR_PLACES.map((place) => ({ place }));
    setRows(next);
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

  async function handleMyLocation() {
    setLocLoading(true);
    setLocCard(null);
    try {
      const loc = await resolveCoordsForWeather();
      if (!loc.ok) {
        if (loc.kind === "permission") {
          Alert.alert(
            t("weather.alertPermissionTitle"),
            t("weather.alertPermissionBody")
          );
        } else if (loc.kind === "services") {
          Alert.alert(
            t("weather.alertErrorTitle"),
            t("errors.locationServicesOff")
          );
        } else {
          Alert.alert(
            t("weather.alertErrorTitle"),
            t("weather.alertErrorBody")
          );
        }
        return;
      }
      const { latitude, longitude } = loc;
      const weather = await fetchCurrentWeather(latitude, longitude);
      const nearest = findNearestPlace(latitude, longitude);
      setLocCard({ lat: latitude, lon: longitude, weather, nearest });
    } catch (e) {
      Alert.alert(
        t("weather.alertErrorTitle"),
        e instanceof Error ? e.message : t("weather.alertErrorBody")
      );
    } finally {
      setLocLoading(false);
    }
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={styles.pageTitle}>{t("weather.title")}</Text>
      <Text style={styles.hint}>{t("weather.hintMobile")}</Text>

      <Pressable
        style={[styles.btn, locLoading && styles.btnDisabled]}
        onPress={() => void handleMyLocation()}
        disabled={locLoading}
      >
        {locLoading ? (
          <ActivityIndicator color={bg} />
        ) : (
          <Text style={styles.btnText}>{t("weather.useLocation")}</Text>
        )}
      </Pressable>

      {locCard && (
        <View style={[styles.card, styles.cardHighlight]}>
          <Text style={styles.cardTitle}>{t("weather.nearYou")}</Text>
          <Text style={styles.bigTemp}>
            {Math.round(locCard.weather.temperatureC)}°C
          </Text>
          <Text style={styles.cond}>
            {weatherCodeLabelLocale(locCard.weather.weatherCode, wl)}
          </Text>
          <Text style={styles.meta}>
            {t("weather.nearestListed")}: {locCard.nearest.label} (
            {locCard.nearest.region})
          </Text>
          <Text style={styles.metaDim}>
            {locCard.weather.humidityPct != null
              ? `${t("weather.humidity")} ${locCard.weather.humidityPct}% · `
              : ""}
            {locCard.weather.windKmh != null
              ? `${t("weather.wind")} ${Math.round(locCard.weather.windKmh)} km/h`
              : ""}
          </Text>
        </View>
      )}

      <View style={styles.rowBetween}>
        <Text style={styles.sectionTitle}>{t("weather.allRegions")}</Text>
        <Pressable onPress={() => void loadAllRegions()} disabled={loadingList}>
          <Text style={styles.link}>{t("weather.refresh")}</Text>
        </Pressable>
      </View>

      {loadingList && rows.length === 0 && (
        <ActivityIndicator color={accent} style={{ marginVertical: 16 }} />
      )}

      {rows.map(({ place, weather, error }) => (
        <View key={place.id} style={styles.card}>
          <Text style={styles.placeName}>{place.label}</Text>
          <Text style={styles.region}>{place.region}</Text>
          {weather ? (
            <>
              <Text style={styles.temp}>
                {Math.round(weather.temperatureC)}°C ·{" "}
                {weatherCodeLabelLocale(weather.weatherCode, wl)}
              </Text>
              <Text style={styles.metaDim}>
                {weather.humidityPct != null ? `${weather.humidityPct}%` : ""}
                {weather.windKmh != null
                  ? ` · ${Math.round(weather.windKmh)} km/h`
                  : ""}
              </Text>
            </>
          ) : error ? (
            <Text style={styles.err}>{error}</Text>
          ) : (
            <ActivityIndicator color={accent} />
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  pageTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: fg,
    marginBottom: 8,
  },
  hint: { color: muted, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  btn: {
    backgroundColor: accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: bg, fontWeight: "700", fontSize: 16 },
  card: {
    backgroundColor: surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  cardHighlight: {
    borderColor: "rgba(92, 184, 122, 0.35)",
    marginBottom: 18,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: accent,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  bigTemp: {
    fontSize: 36,
    fontWeight: "700",
    color: fg,
  },
  cond: { fontSize: 16, color: fg, marginBottom: 6 },
  meta: { fontSize: 13, color: muted },
  metaDim: { fontSize: 12, color: muted, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: fg },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  link: { color: accent, fontWeight: "600", fontSize: 14 },
  placeName: { fontSize: 17, fontWeight: "700", color: fg },
  region: { fontSize: 12, color: muted, marginBottom: 6 },
  temp: { fontSize: 15, color: fg },
  err: { color: "#e89880", fontSize: 13 },
});
