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
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useI18n } from "./LocaleContext";
import { theme } from "./theme";
import { resolveCoordsForWeather } from "./weatherLocation";

function formatMmks(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    n
  );
}

export function MarketTab() {
  const { locale, t } = useI18n();
  const wl = locale === "my" ? "my" : "en";
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<MarketItem | null>(null);
  const [news, setNews] = useState("");
  const [weatherSnap, setWeatherSnap] = useState<CurrentWeatherSnapshot | null>(
    null
  );
  const [weatherLabel, setWeatherLabel] = useState<string | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

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

  async function handleMyLocationWeather() {
    setWeatherLoading(true);
    setWeatherLabel(null);
    try {
      const loc = await resolveCoordsForWeather();
      if (!loc.ok) {
        setWeatherSnap(null);
        if (loc.kind === "permission") {
          setWeatherLabel(t("errors.geoDenied"));
        } else if (loc.kind === "services") {
          setWeatherLabel(t("errors.locationServicesOff"));
        } else {
          setWeatherLabel(t("weather.alertErrorBody"));
        }
        return;
      }
      const { latitude, longitude } = loc;
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
  }

  const marketHint = t("market.hint");

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.titleRow}>
        <Ionicons name="storefront-outline" size={28} color={theme.accent} />
        <Text style={styles.pageTitle}>{t("market.title")}</Text>
      </View>
      {marketHint.trim() ? (
        <Text style={styles.hint}>{marketHint}</Text>
      ) : null}

      <TextInput
        style={styles.search}
        placeholder={t("market.searchPlaceholder")}
        placeholderTextColor={theme.placeholder}
        value={query}
        onChangeText={setQuery}
      />

      {filtered.map((it) => (
        <Pressable
          key={it.id}
          style={[
            styles.row,
            selected?.id === it.id && styles.rowActive,
          ]}
          onPress={() => setSelected(it)}
        >
          <Text style={styles.rowTitle}>{it.itemDetails}</Text>
          {latestMidpoint(it) != null && (
            <Text style={styles.rowMeta}>~{formatMmks(latestMidpoint(it)!)}</Text>
          )}
        </Pressable>
      ))}

      {selected && (
        <View style={styles.card}>
          <Text style={styles.resultLabel}>{t("market.selected")}</Text>
          <Text style={styles.detailTitle}>{selected.itemDetails}</Text>
          <Text style={styles.meta}>
            {[selected.group, selected.mainCategory, selected.itemCategory]
              .filter(Boolean)
              .join(" · ")}
          </Text>

          <View style={styles.weatherRow}>
            <Pressable
              style={[styles.btnSec, weatherLoading && styles.btnDisabled]}
              disabled={weatherLoading}
              onPress={() => void loadYangonWeather()}
            >
              <View style={styles.btnSecInner}>
                <Ionicons name="business-outline" size={20} color={theme.accent} />
                <Text style={styles.btnSecText}>
                  {weatherLoading
                    ? t("market.loading")
                    : t("market.yangonWeather")}
                </Text>
              </View>
            </Pressable>
            <Pressable
              style={[styles.btnSec, weatherLoading && styles.btnDisabled]}
              disabled={weatherLoading}
              onPress={() => void handleMyLocationWeather()}
            >
              <View style={styles.btnSecInner}>
                <Ionicons name="location-outline" size={20} color={theme.accent} />
                <Text style={styles.btnSecText}>{t("market.myLocation")}</Text>
              </View>
            </Pressable>
          </View>
          {weatherLabel ? (
            <Text style={styles.hintTight}>{weatherLabel}</Text>
          ) : null}

          <Text style={styles.hintTight}>{t("market.optionalNews")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("market.newsPlaceholder")}
            placeholderTextColor={theme.placeholder}
            multiline
            value={news}
            onChangeText={setNews}
          />

          {prediction ? (
            <View style={styles.prediction}>
              <Text style={styles.resultLabel}>{t("market.demoForecast")}</Text>
              <Text style={styles.predMid}>
                {formatMmks(prediction.predictedMid)} {t("common.mmk")}
              </Text>
              <Text style={styles.meta}>
                {t("market.range")} {formatMmks(prediction.predictedLow)} –{" "}
                {formatMmks(prediction.predictedHigh)} ·{" "}
                {t("market.baselineMid")}{" "}
                {formatMmks(prediction.baselineMid)} (
                {prediction.baselineDateIso ?? "—"})
              </Text>
              <Text style={styles.factor}>
                {t("market.factorTrend")} ×
                {prediction.factors.trend.toFixed(4)}
                {"\n"}
                {t("market.factorNews")} ×
                {prediction.factors.news.toFixed(4)} (
                {verdictLabelForLocale(
                  locale,
                  prediction.factors.newsVerdict as Verdict
                )}
                )
                {"\n"}
                {t("market.factorWeather")} ×
                {prediction.factors.weather.toFixed(4)} —{" "}
                {prediction.factors.weatherNote}
              </Text>
              <Text style={styles.disclaimer}>
                {t("market.predictionDisclaimer")}
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.fg,
    flex: 1,
  },
  hint: {
    color: theme.fgMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  hintTight: {
    color: theme.fgMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  search: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: theme.fg,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  rowActive: { backgroundColor: theme.accentSoft },
  rowTitle: { flex: 1, color: theme.fg, fontSize: 16, lineHeight: 22 },
  rowMeta: { color: theme.price, fontSize: 15, fontWeight: "700" },
  card: {
    marginTop: 16,
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.fgMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  detailTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.fg,
    lineHeight: 24,
    marginBottom: 6,
  },
  meta: {
    color: theme.fgMuted,
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  weatherRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  btnSec: {
    flex: 1,
    backgroundColor: theme.accentSoft,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.accentBorder,
  },
  btnSecInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  btnSecText: { color: theme.accent, fontWeight: "700", fontSize: 14 },
  btnDisabled: { opacity: 0.5 },
  input: {
    backgroundColor: theme.surfaceAlt,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: theme.fg,
    minHeight: 100,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 12,
  },
  prediction: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  predMid: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.price,
    marginBottom: 6,
  },
  factor: {
    color: theme.fg,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
    opacity: 0.92,
  },
  disclaimer: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
    color: theme.fgMuted,
  },
});
