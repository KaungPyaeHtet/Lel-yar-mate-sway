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
  forecastKyatFromMlPct,
  formatLongDateLabel,
  formatSignedPercent,
  getDefaultMarketItemForUi,
  getMarketItemById,
  initialMarketTabItemId,
  MARKET_ITEMS,
  tomorrowDateIsoLocal,
  getMlApiBaseUrl,
  midPriceMomentumPct,
  observationMidsOldestToNewest,
  predictItemPrice,
  rainfallMmHintFromWeatherCode,
  recentMidPricesForInference,
  riceMidSeriesForChart,
  searchMarketItems,
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
  TextInput,
  View,
} from "react-native";
import { useI18n } from "./LocaleContext";
import { UiText } from "./UiText";
import { myLh, theme } from "./theme";
import { PriceHistoryChartMobile } from "./PriceHistoryChart";
import { resolveCoordsForWeather } from "./weatherLocation";

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

function formatMmks(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    n
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
  const strength = adviceStrengthWord(confPct, t);
  const showHeadlines = newsLines.slice(0, ADVICE_HEADLINES_SHOWN);
  const moreHeadlines = newsLines.length - showHeadlines.length;

  return (
    <View style={styles.adviceRationale}>
      <UiText style={styles.rationaleP}>
        {tf("market.adviceWhySummary", {
          pct: formatSignedPercent(detail.nextDayPctChange),
          strength,
        })}
      </UiText>
      <UiText style={styles.rationaleP}>{t("market.adviceWhyTrust")}</UiText>
      <UiText style={styles.rationaleP}>{t("market.adviceWhyInputs")}</UiText>
      {usedPlaceholderNews ? (
        <UiText style={styles.rationaleP}>
          {t("market.adviceDetailsPlaceholderNews")}
        </UiText>
      ) : null}
      {!usedPlaceholderNews && newsLines.length > 0 ? (
        <>
          <UiText style={styles.rationaleLabel}>
            {t("market.adviceWhyHeadlines")}
          </UiText>
          {showHeadlines.map((line, i) => (
            <UiText key={i} style={styles.rationaleBullet}>
              {"\u2022 "}
              {line}
            </UiText>
          ))}
          {moreHeadlines > 0 ? (
            <UiText style={styles.rationaleMore}>
              {tf("market.adviceWhyHeadlinesMore", { n: moreHeadlines })}
            </UiText>
          ) : null}
        </>
      ) : !usedPlaceholderNews ? (
        <UiText style={styles.rationaleP}>
          {t("market.adviceDetailsPlaceholderNews")}
        </UiText>
      ) : null}
      <UiText style={styles.rationaleP}>
        {tf("market.adviceWhyWeather", {
          temp: Math.round(weatherSnap.temperatureC * 10) / 10,
          condition: cond,
        })}
      </UiText>
      <UiText style={styles.rationaleP}>
        {tf("market.adviceWhyTrend", {
          d1: formatSignedPercent(detail.priceChange1dPct),
          d7: formatSignedPercent(detail.priceChange7dPct),
        })}
      </UiText>
      <UiText style={styles.rationaleP}>
        {tf("market.adviceWhySimpleRead", { verdict: screenVerdictLabel })}
      </UiText>
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
      <UiText
        style={[
          styles.adviceGlyph,
          advice === "hold" && styles.adviceGlyphHold,
          advice === "sell" && styles.adviceGlyphSell,
          advice === "neutral" && styles.adviceGlyphNeutral,
        ]}
      >
        {glyph}
      </UiText>
      <View style={styles.adviceTextWrap}>
        <UiText style={styles.adviceTitle}>{t(titleKey)}</UiText>
        <UiText style={styles.adviceSub}>{t(subKey)}</UiText>
        <UiText style={styles.adviceTapHint}>{t("market.adviceDetailsToggle")}</UiText>
      </View>
    </Pressable>
  );
}

export function MarketTab() {
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
    const prices = recentMidPricesForInference(selected, 8);
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

  const forecastForDateLabel =
    prediction != null
      ? formatLongDateLabel(tomorrowDateIsoLocal(), locale)
      : null;

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

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.titleRow}>
        <Ionicons
          name="storefront-outline"
          size={28}
          color={theme.accent}
          style={styles.titleIcon}
        />
        <UiText style={styles.pageTitle}>{t("market.title")}</UiText>
      </View>
      <View style={styles.card}>
        <UiText style={styles.resultLabel}>{t("market.chooseItem")}</UiText>
        <TextInput
          style={styles.filterInput}
          placeholder={t("market.itemFilterPlaceholder")}
          placeholderTextColor={theme.fgMuted}
          value={itemFilter}
          onChangeText={setItemFilter}
          accessibilityLabel={t("market.searchAria")}
        />
        <UiText style={styles.meta}>
          {tf("market.itemListHint", {
            shown: shownItems.length,
            total: allMatching.length,
          })}
        </UiText>
        {allMatching.length > shownItems.length ? (
          <UiText style={styles.meta}>{t("market.itemListCap")}</UiText>
        ) : null}
        <ScrollView
          style={styles.itemPicker}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
          {shownItems.map((it) => (
            <Pressable
              key={it.id}
              onPress={() => setItemId(it.id)}
              style={({ pressed }) => [
                styles.itemRow,
                it.id === itemId && styles.itemRowActive,
                pressed && styles.itemRowPressed,
              ]}
            >
              <UiText style={styles.itemRowTitle}>{it.itemDetails}</UiText>
              <UiText style={styles.itemRowMeta}>{it.itemCategory}</UiText>
            </Pressable>
          ))}
        </ScrollView>

        <UiText style={styles.resultLabel}>{t("market.selected")}</UiText>
        <UiText style={styles.detailTitle}>{selected.itemDetails}</UiText>
        <UiText style={styles.meta}>
          {[selected.group, selected.mainCategory, selected.itemCategory]
            .filter(Boolean)
            .join(" · ")}
        </UiText>

        <UiText style={styles.resultLabel}>{t("market.chartTitle")}</UiText>
        {latestDateLabel ? (
          <UiText style={styles.dateCaption}>
            {tf("market.chartDataThrough", { date: latestDateLabel })}
          </UiText>
        ) : null}
        <PriceHistoryChartMobile series={chartSeries} locale={locale} />

        {displayForecastMid != null && prediction ? (
          <View style={styles.prediction}>
            <UiText style={styles.resultLabel}>
              {t("market.forecastPriceTitle")}
            </UiText>
            {latestDateLabel ? (
              <UiText style={styles.dateCaption}>
                {tf("market.forecastFromLatest", { date: latestDateLabel })}
              </UiText>
            ) : null}
            {forecastForDateLabel ? (
              <UiText style={styles.forecastForDateCaption}>
                {tf("market.forecastForDate", { date: forecastForDateLabel })}
              </UiText>
            ) : null}
            <UiText style={styles.predMid}>
              {formatMmks(displayForecastMid)} {t("common.mmk")}
            </UiText>
            {mlForecastKyat ? (
              <UiText style={styles.dateCaption}>
                {t("market.forecastMlSource")}
              </UiText>
            ) : mlBase && mlLoading ? (
              <UiText style={styles.dateCaption}>
                {t("market.forecastAwaitingMl")}
              </UiText>
            ) : (
              <UiText style={styles.dateCaption}>
                {t("market.forecastHeuristicSource")}
              </UiText>
            )}
          </View>
        ) : null}

        <View style={styles.mlBlock}>
          <UiText style={styles.resultLabel}>{t("market.adviceTitle")}</UiText>
          {latestDateLabel ? (
            <UiText style={styles.dateCaption}>
              {tf("market.mlUsesLatestDate", { date: latestDateLabel })}
            </UiText>
          ) : null}
          {mlBase ? (
            <>
              {mlLoading ? (
                <UiText style={styles.meta}>{t("market.mlBackendLoading")}</UiText>
              ) : null}
              {mlErr ? <UiText style={styles.mlErr}>{mlErr}</UiText> : null}
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
                <UiText style={styles.adviceDisclaimer}>
                  {t("market.adviceDisclaimer")}
                </UiText>
              ) : null}
            </>
          ) : (
            <UiText style={styles.hintTight}>{t("market.mlBackendNoUrl")}</UiText>
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
  hintTight: {
    color: theme.fgMuted,
    fontSize: 14,
    lineHeight: myLh(14),
    marginBottom: 12,
  },
  card: {
    marginTop: 8,
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 16,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: theme.border,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.fg,
    marginBottom: 8,
  },
  itemPicker: {
    maxHeight: 220,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
  },
  itemRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  itemRowActive: {
    backgroundColor: "rgba(76, 175, 80, 0.12)",
  },
  itemRowPressed: { opacity: 0.92 },
  itemRowTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.fg,
    lineHeight: myLh(14),
  },
  itemRowMeta: {
    marginTop: 4,
    fontSize: 12,
    color: theme.price,
    fontWeight: "700",
    lineHeight: myLh(12),
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.fgMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
    lineHeight: myLh(12),
  },
  detailTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.fg,
    lineHeight: myLh(17),
    marginBottom: 8,
  },
  meta: {
    color: theme.fgMuted,
    fontSize: 14,
    marginBottom: 12,
    lineHeight: myLh(14),
  },
  dateCaption: {
    color: theme.fgMuted,
    fontSize: 13,
    lineHeight: myLh(13),
    marginBottom: 10,
    marginTop: 2,
  },
  forecastForDateCaption: {
    color: theme.fg,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: myLh(14),
    marginBottom: 8,
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
    marginBottom: 8,
    lineHeight: myLh(24),
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
    lineHeight: myLh(14),
  },
  adviceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 6,
    marginBottom: 4,
    padding: 14,
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
    lineHeight: myLh(22),
  },
  adviceGlyphHold: { color: "#66bb6a" },
  adviceGlyphSell: { color: "#ef5350" },
  adviceGlyphNeutral: { color: "rgba(232, 244, 236, 0.5)" },
  adviceTextWrap: { flex: 1, minWidth: 0 },
  adviceTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.fg,
    lineHeight: myLh(16),
  },
  adviceSub: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: myLh(13),
    color: theme.fgMuted,
  },
  adviceTapHint: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
    color: theme.accent,
    lineHeight: myLh(12),
  },
  adviceRowPressed: { opacity: 0.9 },
  adviceRationale: {
    marginTop: 10,
    padding: 14,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.06)",
    borderWidth: 1,
    borderColor: theme.border,
  },
  rationaleP: {
    fontSize: 13,
    lineHeight: myLh(13),
    color: theme.fgMuted,
    marginBottom: 10,
  },
  rationaleLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: theme.fg,
    marginBottom: 6,
    marginTop: 6,
    lineHeight: myLh(11),
  },
  rationaleBullet: {
    fontSize: 13,
    lineHeight: myLh(13),
    color: theme.fgMuted,
    marginBottom: 6,
    paddingLeft: 4,
  },
  rationaleMore: {
    fontSize: 12,
    lineHeight: myLh(12),
    color: theme.fgMuted,
    marginBottom: 10,
    fontStyle: "italic",
  },
  adviceDisclaimer: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: myLh(12),
    color: theme.fgMuted,
  },
});
