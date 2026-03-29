import {
  MYANMAR_PLACES,
  type AppLocale,
  type AppStringKey,
  type CurrentWeatherSnapshot,
  type MlNextDayDetail,
  type RiceMlAdvice,
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
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useI18n } from "./LocaleContext";
import { theme } from "./theme";
import { resolveCoordsForWeather } from "./weatherLocation";

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

function MlAdviceRationaleMobile({
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
    <View style={styles.adviceRationale}>
      <Text style={styles.rationaleP}>
        {tf("market.adviceDetailsModelMove", {
          pct: formatSignedPercent(detail.nextDayPctChange),
        })}
      </Text>
      <Text style={styles.rationaleP}>
        {tf("market.adviceDetailsSignal", { pct: confPct })}
      </Text>
      <Text style={styles.rationaleP}>{t("market.adviceDetailsSignalNote")}</Text>
      <Text style={styles.rationaleP}>
        {tf("market.adviceDetailsSentiment", {
          score: formatSentimentScore(detail.sentimentScore),
        })}
      </Text>
      <Text style={styles.rationaleP}>
        {t("market.adviceDetailsSentimentHint")}
      </Text>
      <Text style={styles.rationaleLabel}>
        {t("market.adviceDetailsNewsLabel")}
      </Text>
      {usedPlaceholderNews ? (
        <Text style={styles.rationaleP}>
          {t("market.adviceDetailsPlaceholderNews")}
        </Text>
      ) : null}
      {newsLines.map((line, i) => (
        <Text key={i} style={styles.rationaleBullet}>
          {"\u2022 "}
          {line}
        </Text>
      ))}
      {!usedPlaceholderNews && newsLines.length === 0 ? (
        <Text style={styles.rationaleP}>
          {t("market.adviceDetailsPlaceholderNews")}
        </Text>
      ) : null}
      <Text style={styles.rationaleP}>
        {tf("market.adviceDetailsWeather", {
          temp: Math.round(weatherSnap.temperatureC * 10) / 10,
          condition: cond,
          rain: detail.rainfallMm,
        })}
      </Text>
      <Text style={styles.rationaleP}>
        {tf("market.adviceDetailsPattern", {
          d1: formatSignedPercent(detail.priceChange1dPct),
          d7: formatSignedPercent(detail.priceChange7dPct),
        })}
      </Text>
      <Text style={styles.rationaleP}>
        {tf("market.adviceDetailsScreenRule", { verdict: screenVerdictLabel })}
      </Text>
    </View>
  );
}

function MlAdviceRow({
  advice,
  t,
  onPress,
}: {
  advice: RiceMlAdvice;
  t: (k: AppStringKey) => string;
  onPress: () => void;
}) {
  const glyph = advice === "hold" ? "▲" : advice === "sell" ? "✕" : "—";
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
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.adviceRow,
        advice === "hold" && styles.adviceRowHold,
        advice === "sell" && styles.adviceRowSell,
        advice === "neutral" && styles.adviceRowNeutral,
        pressed && styles.adviceRowPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={t(titleKey)}
      accessibilityHint={t("market.adviceDetailsToggle")}
    >
      <Text
        style={[
          styles.adviceGlyph,
          advice === "hold" && styles.adviceGlyphHold,
          advice === "sell" && styles.adviceGlyphSell,
          advice === "neutral" && styles.adviceGlyphNeutral,
        ]}
      >
        {glyph}
      </Text>
      <View style={styles.adviceTextWrap}>
        <Text style={styles.adviceTitle}>{t(titleKey)}</Text>
        <Text style={styles.adviceSub}>{t(subKey)}</Text>
        <Text style={styles.adviceTapHint}>{t("market.adviceDetailsToggle")}</Text>
      </View>
    </Pressable>
  );
}

export function MarketTab() {
  const { locale, t, tf } = useI18n();
  const selected = useMemo(() => getPrimaryRiceMarketItem(), []);
  const [newsAuto, setNewsAuto] = useState("");
  const [newsLoading, setNewsLoading] = useState(true);
  const [weatherSnap, setWeatherSnap] = useState<CurrentWeatherSnapshot | null>(
    null
  );
  const [mlDetail, setMlDetail] = useState<MlNextDayDetail | null>(null);
  const [adviceDetailOpen, setAdviceDetailOpen] = useState(false);
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
        /* empty */
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
        const loc = await resolveCoordsForWeather();
        if (!loc.ok) {
          await applyYangon();
          return;
        }
        const w = await fetchCurrentWeather(loc.latitude, loc.longitude);
        if (!cancelled) setWeatherSnap(w);
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
    setAdviceDetailOpen(false);
    const headline = newsAuto.trim() || ML_HEADLINE_FALLBACK;
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
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.titleRow}>
        <Ionicons name="storefront-outline" size={28} color={theme.accent} />
        <Text style={styles.pageTitle}>{t("market.title")}</Text>
      </View>

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

        {prediction ? (
          <View style={styles.prediction}>
            <Text style={styles.resultLabel}>
              {t("market.forecastPriceTitle")}
            </Text>
            <Text style={styles.predMid}>
              {formatMmks(prediction.predictedMid)} {t("common.mmk")}
            </Text>
            <Text style={styles.disclaimer}>
              {t("market.predictionDisclaimer")}
            </Text>
          </View>
        ) : null}

        <View style={styles.mlBlock}>
          <Text style={styles.resultLabel}>{t("market.adviceTitle")}</Text>
          {mlBase ? (
            <>
              {mlLoading ? (
                <Text style={styles.meta}>{t("market.mlBackendLoading")}</Text>
              ) : null}
              {mlErr ? <Text style={styles.mlErr}>{mlErr}</Text> : null}
              {mlDetail != null && weatherSnap ? (
                <>
                  <MlAdviceRow
                    advice={adviceFromMlNextDayPct(
                      mlDetail.nextDayPctChange
                    )}
                    t={t}
                    onPress={() =>
                      setAdviceDetailOpen((open) => !open)
                    }
                  />
                  {adviceDetailOpen ? (
                    <MlAdviceRationaleMobile
                      locale={locale}
                      t={t}
                      tf={tf}
                      detail={mlDetail}
                      newsLines={newsLines}
                      weatherSnap={weatherSnap}
                      screenVerdictLabel={screenVerdictLabel}
                      usedPlaceholderNews={usedPlaceholderNews}
                    />
                  ) : null}
                </>
              ) : null}
              {mlDetail != null ? (
                <Text style={styles.adviceDisclaimer}>
                  {t("market.adviceDisclaimer")}
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.hintTight}>{t("market.mlBackendNoUrl")}</Text>
          )}
        </View>
      </View>
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
  hintTight: {
    color: theme.fgMuted,
    fontSize: 14,
    lineHeight: 20,
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
  card: {
    marginTop: 8,
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
    marginTop: 4,
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
  disclaimer: {
    marginTop: 8,
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
  adviceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 6,
    marginBottom: 4,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  adviceRowHold: {
    backgroundColor: "rgba(76, 175, 80, 0.15)",
    borderColor: "rgba(76, 175, 80, 0.45)",
  },
  adviceRowSell: {
    backgroundColor: "rgba(239, 83, 80, 0.15)",
    borderColor: "rgba(239, 83, 80, 0.45)",
  },
  adviceRowNeutral: {
    backgroundColor: "rgba(120, 140, 130, 0.12)",
    borderColor: theme.border,
  },
  adviceGlyph: {
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 26,
  },
  adviceGlyphHold: { color: "#66bb6a" },
  adviceGlyphSell: { color: "#ef5350" },
  adviceGlyphNeutral: { color: "rgba(232, 244, 236, 0.5)" },
  adviceTextWrap: { flex: 1, minWidth: 0 },
  adviceTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.fg,
  },
  adviceSub: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: theme.fgMuted,
  },
  adviceTapHint: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
    color: theme.accent,
  },
  adviceRowPressed: { opacity: 0.9 },
  adviceRationale: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.06)",
    borderWidth: 1,
    borderColor: theme.border,
  },
  rationaleP: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.fgMuted,
    marginBottom: 8,
  },
  rationaleLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: theme.fg,
    marginBottom: 4,
    marginTop: 4,
  },
  rationaleBullet: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.fgMuted,
    marginBottom: 4,
    paddingLeft: 4,
  },
  adviceDisclaimer: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
    color: theme.fgMuted,
  },
});
