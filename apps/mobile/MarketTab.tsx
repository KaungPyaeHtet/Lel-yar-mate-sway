import {
  MYANMAR_PLACES,
  type AppLocale,
  type CurrentWeatherSnapshot,
  type MarketItem,
  type Verdict,
  fetchCurrentWeather,
  fetchMlNextDayPct,
  findNearestPlace,
  getMlApiBaseUrl,
  latestMidpoint,
  predictItemPrice,
  recentMidPricesForMl,
  riceMidSeriesForChart,
  RICE_MARKET_ITEMS,
  RICE_MARKET_SHEET_GENERATED_AT_ISO,
  RICE_MARKET_USES_SEED_DATA,
  searchRiceMarketItems,
  verdictLabelForLocale,
  weatherCodeLabelLocale,
} from "@agriora/core";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useMemo, useState } from "react";
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

function RicePriceMiniBars({
  series,
  locale,
}: {
  series: { dateIso: string; mid: number }[];
  locale: AppLocale;
}) {
  if (series.length < 2) {
    return (
      <Text style={styles.chartEmpty}>
        {locale === "my"
          ? "ပြသရန် ဈေးမှတ်တမ်း မလုံလောက်ပါ။"
          : "Not enough history for a chart."}
      </Text>
    );
  }
  const mids = series.map((s) => s.mid);
  const minV = Math.min(...mids);
  const maxV = Math.max(...mids);
  const span = maxV - minV || 1;
  const H = 112;
  return (
    <View style={styles.chartBlock}>
      <View style={[styles.chartBars, { height: H }]}>
        {series.map((p) => {
          const h = Math.max(6, ((p.mid - minV) / span) * (H - 28));
          return (
            <View key={p.dateIso} style={styles.chartBarCol}>
              <View style={[styles.chartBar, { height: h }]} />
              <Text style={styles.chartBarDate} numberOfLines={1}>
                {p.dateIso.slice(5)}
              </Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.chartRangeLabel}>
        {formatMmks(Math.round(minV))} – {formatMmks(Math.round(maxV))}{" "}
        {locale === "my" ? "ကျပ်" : "MMK"}
      </Text>
    </View>
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
  const [mlPct, setMlPct] = useState<number | null>(null);
  const [mlErr, setMlErr] = useState<string | null>(null);
  const [mlLoading, setMlLoading] = useState(false);

  const mlBase = getMlApiBaseUrl();

  useEffect(() => {
    setMlPct(null);
    setMlErr(null);
  }, [selected?.id]);

  const filtered = useMemo(
    () => searchRiceMarketItems(query).slice(0, 80),
    [query]
  );

  const chartSeries = useMemo(
    () => (selected ? riceMidSeriesForChart(selected) : []),
    [selected]
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

  async function fetchPythonMl() {
    if (!selected) return;
    const prices = recentMidPricesForMl(selected, 8);
    if (!prices) {
      setMlErr(t("market.mlBackendNeedHistory"));
      return;
    }
    setMlLoading(true);
    setMlErr(null);
    try {
      const pct = await fetchMlNextDayPct({
        avgPrices: prices,
        rainfallMm: 5,
        tempC: weatherSnap?.temperatureC ?? 28,
        newsHeadline: news.trim() || "No headline.",
      });
      setMlPct(pct);
    } catch (e) {
      setMlErr(
        e instanceof Error ? e.message : t("errors.mlBackend")
      );
    } finally {
      setMlLoading(false);
    }
  }

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
      <Text style={styles.hint}>
        {tf("market.hint", {
          count: RICE_MARKET_ITEMS.length,
          generated: RICE_MARKET_SHEET_GENERATED_AT_ISO,
        })}
      </Text>
      {RICE_MARKET_USES_SEED_DATA ? (
        <Text style={styles.riceSeedNote}>{t("market.riceSeedNote")}</Text>
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

          <Text style={styles.resultLabel}>{t("market.chartTitle")}</Text>
          <RicePriceMiniBars series={chartSeries} locale={locale} />

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

          <View style={styles.mlBlock}>
            <Text style={styles.resultLabel}>{t("market.mlBackendTitle")}</Text>
            <Text style={styles.hintTight}>{t("market.mlBackendHint")}</Text>
            {mlBase ? (
              <>
                <Pressable
                  style={[styles.btnSec, mlLoading && styles.btnDisabled]}
                  disabled={mlLoading}
                  onPress={() => void fetchPythonMl()}
                >
                  <View style={styles.btnSecInner}>
                    <Ionicons name="cloud-outline" size={20} color={theme.accent} />
                    <Text style={styles.btnSecText}>
                      {mlLoading
                        ? t("market.mlBackendLoading")
                        : t("market.mlBackendFetch")}
                    </Text>
                  </View>
                </Pressable>
                {mlErr ? (
                  <Text style={styles.mlErr}>{mlErr}</Text>
                ) : null}
                {mlPct != null ? (
                  <Text style={styles.meta}>
                    {t("market.mlBackendResult")}:{" "}
                    <Text style={styles.mlPct}>{mlPct.toFixed(3)}</Text>
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.hintTight}>{t("market.mlBackendNoUrl")}</Text>
            )}
          </View>
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
  riceSeedNote: {
    color: "rgba(200, 220, 205, 0.85)",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },
  chartBlock: { marginBottom: 12 },
  chartBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 4,
    marginTop: 6,
  },
  chartBarCol: { flex: 1, alignItems: "center", minWidth: 28 },
  chartBar: {
    width: "70%",
    maxWidth: 16,
    backgroundColor: "#7dd89a",
    borderRadius: 4,
    opacity: 1,
  },
  chartBarDate: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(232, 244, 236, 0.9)",
  },
  chartEmpty: {
    fontSize: 14,
    color: "rgba(232, 244, 236, 0.75)",
    marginBottom: 8,
  },
  chartRangeLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(232, 244, 236, 0.92)",
    marginTop: 6,
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
  mlBlock: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  mlErr: {
    color: "#e57373",
    fontSize: 14,
    marginTop: 8,
  },
  mlPct: { fontWeight: "700", color: theme.price },
});
