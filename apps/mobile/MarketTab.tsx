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
  MARKET_GENERATED_AT_ISO,
  MARKET_ITEMS,
} from "@agriora/core";
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
import { resolveCoordsForWeather } from "./weatherLocation";

const bg = "#0c120f";
const fg = "#e6ede8";
const muted = "rgba(230, 237, 232, 0.55)";
const accent = "#5cb87a";
const surface = "#141c17";

function formatMmks(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    n
  );
}

export function MarketTab() {
  const { locale, t, tf } = useI18n();
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

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.pageTitle}>{t("market.title")}</Text>
      <Text style={styles.hint}>
        {tf("market.hint", {
          count: MARKET_ITEMS.length,
          generated: MARKET_GENERATED_AT_ISO,
        })}
      </Text>

      <TextInput
        style={styles.search}
        placeholder={t("market.searchPlaceholder")}
        placeholderTextColor="rgba(230,237,232,0.35)"
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
              <Text style={styles.btnSecText}>
                {weatherLoading ? t("market.loading") : t("market.yangonWeather")}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.btnSec, weatherLoading && styles.btnDisabled]}
              disabled={weatherLoading}
              onPress={() => void handleMyLocationWeather()}
            >
              <Text style={styles.btnSecText}>{t("market.myLocation")}</Text>
            </Pressable>
          </View>
          {weatherLabel ? (
            <Text style={styles.hintTight}>{weatherLabel}</Text>
          ) : null}

          <Text style={styles.hintTight}>{t("market.optionalNews")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("market.newsPlaceholder")}
            placeholderTextColor="rgba(230,237,232,0.35)"
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
  pageTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: fg,
    marginBottom: 8,
  },
  hint: { color: muted, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  hintTight: { color: muted, fontSize: 13, lineHeight: 18, marginBottom: 8 },
  search: {
    backgroundColor: surface,
    borderRadius: 12,
    padding: 12,
    color: fg,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  rowActive: { backgroundColor: "rgba(92, 184, 122, 0.12)" },
  rowTitle: { flex: 1, color: fg, fontSize: 14, lineHeight: 20 },
  rowMeta: { color: accent, fontSize: 13, fontWeight: "600" },
  card: {
    marginTop: 16,
    backgroundColor: surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  resultLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: fg,
    lineHeight: 22,
    marginBottom: 6,
  },
  meta: { color: muted, fontSize: 13, marginBottom: 12, lineHeight: 18 },
  weatherRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  btnSec: {
    flex: 1,
    backgroundColor: "rgba(92, 184, 122, 0.2)",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  btnSecText: { color: "#7dd89a", fontWeight: "700", fontSize: 14 },
  btnDisabled: { opacity: 0.5 },
  input: {
    backgroundColor: bg,
    borderRadius: 12,
    padding: 12,
    color: fg,
    minHeight: 100,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 12,
  },
  prediction: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  predMid: {
    fontSize: 22,
    fontWeight: "700",
    color: "#7dd89a",
    marginBottom: 6,
  },
  factor: {
    color: "rgba(230,237,232,0.75)",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  disclaimer: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 17,
    color: "rgba(230,237,232,0.45)",
  },
});
