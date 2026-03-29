import {
  MYANMAR_PLACES,
  type CurrentWeatherSnapshot,
  type MyanmarPlace,
  fetchCurrentWeather,
  findNearestPlace,
  weatherCodeLabelLocale,
} from "@agriora/core";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useI18n } from "./LocaleContext";
import { UiText } from "./UiText";
import { myLh, theme } from "./theme";
import { resolveCoordsForWeather } from "./weatherLocation";

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
      <View style={styles.titleRow}>
        <Ionicons
          name="partly-sunny-outline"
          size={28}
          color={theme.accent}
          style={styles.titleIcon}
        />
        <UiText style={styles.pageTitle}>{t("weather.title")}</UiText>
      </View>

      <Pressable
        style={[styles.btn, locLoading && styles.btnDisabled]}
        onPress={() => void handleMyLocation()}
        disabled={locLoading}
      >
        {locLoading ? (
          <ActivityIndicator color={theme.onAccent} />
        ) : (
          <View style={styles.btnInner}>
            <Ionicons name="navigate-outline" size={22} color={theme.onAccent} />
            <UiText style={styles.btnText}>{t("weather.useLocation")}</UiText>
          </View>
        )}
      </Pressable>

      {locCard && (
        <View style={[styles.card, styles.cardHighlight]}>
          <UiText style={styles.cardTitle}>{t("weather.nearYou")}</UiText>
          <UiText style={styles.bigTemp}>
            {Math.round(locCard.weather.temperatureC)}°C
          </UiText>
          <UiText style={styles.cond}>
            {weatherCodeLabelLocale(locCard.weather.weatherCode, wl)}
          </UiText>
          <UiText style={styles.meta}>
            {t("weather.nearestListed")}: {locCard.nearest.label} (
            {locCard.nearest.region})
          </UiText>
          <UiText style={styles.metaDim}>
            {locCard.weather.humidityPct != null
              ? `${t("weather.humidity")} ${locCard.weather.humidityPct}% · `
              : ""}
            {locCard.weather.windKmh != null
              ? `${t("weather.wind")} ${Math.round(locCard.weather.windKmh)} km/h`
              : ""}
          </UiText>
        </View>
      )}

      <View style={styles.rowBetween}>
        <UiText style={styles.sectionTitle}>{t("weather.allRegions")}</UiText>
        <Pressable
          onPress={() => void loadAllRegions()}
          disabled={loadingList}
          style={styles.refreshBtn}
        >
          <Ionicons name="refresh-outline" size={18} color={theme.accent} />
          <UiText style={styles.link}>{t("weather.refresh")}</UiText>
        </Pressable>
      </View>

      {loadingList && rows.length === 0 && (
        <ActivityIndicator color={theme.accent} style={{ marginVertical: 16 }} />
      )}

      {rows.map(({ place, weather, error }) => (
        <View key={place.id} style={styles.card}>
          <UiText style={styles.placeName}>{place.label}</UiText>
          <UiText style={styles.region}>{place.region}</UiText>
          {weather ? (
            <>
              <UiText style={styles.temp}>
                {Math.round(weather.temperatureC)}°C ·{" "}
                {weatherCodeLabelLocale(weather.weatherCode, wl)}
              </UiText>
              <UiText style={styles.metaDim}>
                {weather.humidityPct != null ? `${weather.humidityPct}%` : ""}
                {weather.windKmh != null
                  ? ` · ${Math.round(weather.windKmh)} km/h`
                  : ""}
              </UiText>
            </>
          ) : error ? (
            <UiText style={styles.err}>{error}</UiText>
          ) : (
            <ActivityIndicator color={theme.accent} />
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  titleIcon: { marginTop: 4 },
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.fg,
    flex: 1,
    flexShrink: 1,
    lineHeight: myLh(24),
    paddingTop: 2,
  },
  btn: {
    backgroundColor: theme.accent,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
    minHeight: 56,
    justifyContent: "center",
  },
  btnDisabled: { opacity: 0.7 },
  btnInner: { flexDirection: "row", alignItems: "center", gap: 10 },
  btnText: {
    color: theme.onAccent,
    fontWeight: "700",
    fontSize: 17,
    lineHeight: myLh(17),
    textAlign: "center",
    paddingHorizontal: 8,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardHighlight: {
    borderColor: theme.accentBorder,
    borderWidth: 2,
    marginBottom: 18,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.accent,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    lineHeight: myLh(12),
  },
  bigTemp: {
    fontSize: 38,
    fontWeight: "700",
    color: theme.fg,
    lineHeight: Math.round(38 * 1.25),
  },
  cond: {
    fontSize: 17,
    color: theme.fg,
    marginBottom: 8,
    lineHeight: myLh(17),
  },
  meta: { fontSize: 14, color: theme.fgMuted, lineHeight: myLh(14) },
  metaDim: {
    fontSize: 13,
    color: theme.fgMuted,
    marginTop: 6,
    lineHeight: myLh(13),
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.fg,
    lineHeight: myLh(17),
    flex: 1,
    flexShrink: 1,
    paddingRight: 8,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  refreshBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  link: {
    color: theme.accent,
    fontWeight: "700",
    fontSize: 15,
    lineHeight: myLh(15),
  },
  placeName: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.fg,
    lineHeight: myLh(18),
  },
  region: {
    fontSize: 13,
    color: theme.fgMuted,
    marginBottom: 8,
    lineHeight: myLh(13),
  },
  temp: { fontSize: 16, color: theme.fg, lineHeight: myLh(16) },
  err: { color: theme.warn, fontSize: 14, lineHeight: myLh(14) },
});
