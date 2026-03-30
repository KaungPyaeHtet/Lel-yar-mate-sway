import {
  MYANMAR_PLACES,
  type AppLocale,
  type AppStringKey,
  type CurrentWeatherSnapshot,
  type MlNextDayDetail,
  type RiceMlAdvice,
  adviceFromMlNextDayPct,
  blendScreenNewsVerdictWithMomentum,
  fetchCurrentWeather,
  fetchWeatherHistoryDaily,
  fetchMlNextDayDetail,
  fetchRiceMarketNewsContext,
  forecastKyatFromMlPct,
  formatSignedPercent,
  getDefaultMarketItemForUi,
  initialMarketTabItemIdFrom,
  marketItemLabelForLocale,
  marketItemMetaLineForLocale,
  marketItemSearchBlob,
  MARKET_ITEMS,
  mlNewsHeadlineForItem,
  newsHeadlinesForMlHistory,
  getMlApiBaseUrl,
  midPriceMomentumPct,
  observationMidsOldestToNewest,
  predictItemPrice,
  rainfallMmHintFromWeatherCode,
  recentMidPricesForInference,
  riceMidSeriesForChartDisplay,
  riceNewsContextToLines,
  verdictLabelForLocale,
  weatherCodeLabelLocale,
  type MarketItem,
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

function buildOfflineMlDetail(
  prediction: NonNullable<ReturnType<typeof predictItemPrice>>,
  weatherSnap: CurrentWeatherSnapshot,
  momentum: { change1dPct: number; change7dPct: number } | null
): MlNextDayDetail {
  const nextDayPctChange =
    prediction.baselineMid > 0
      ? (prediction.predictedMid / prediction.baselineMid - 1) * 100
      : 0;
  const sentimentScore =
    prediction.factors.newsVerdict === "up"
      ? 0.35
      : prediction.factors.newsVerdict === "down"
        ? -0.35
        : 0;
  const m1 = momentum?.change1dPct ?? 0;
  const m7 = momentum?.change7dPct ?? 0;
  const confidenceHint = Math.min(
    0.9,
    Math.max(0.52, 0.58 + Math.min(0.12, Math.abs(nextDayPctChange) * 0.03))
  );
  return {
    nextDayPctChange,
    sentimentScore,
    priceChange1dPct: m1,
    priceChange7dPct: m7,
    tempC: weatherSnap.temperatureC,
    rainfallMm: rainfallMmHintFromWeatherCode(weatherSnap.weatherCode),
    confidenceHint,
  };
}

function MlAdviceRationaleMobile({
  locale,
  t,
  tf,
  detail,
  itemLabel,
  newsLines,
  weatherSnap,
  screenVerdictLabel,
  usedPlaceholderNews,
}: {
  locale: AppLocale;
  t: (k: AppStringKey) => string;
  tf: (k: AppStringKey, vars: Record<string, string | number>) => string;
  detail: MlNextDayDetail;
  itemLabel: string;
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
          item: itemLabel,
          pct: formatSignedPercent(detail.nextDayPctChange),
          strength,
        })}
      </UiText>
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

type MarketTabProps = {
  /** When embedded under the farming hub, hide the duplicate page title. */
  hideTitle?: boolean;
  /** Limit the commodity list (e.g. စိုက်ပျိုးရေး vs မွေးမြူရေး). */
  marketItems?: readonly MarketItem[];
};

export function MarketTab({ hideTitle = false, marketItems }: MarketTabProps) {
  const { locale, t, tf } = useI18n();
  const pool = useMemo(
    () => marketItems ?? MARKET_ITEMS,
    [marketItems]
  );
  const [itemId, setItemId] = useState(() =>
    initialMarketTabItemIdFrom(marketItems ?? MARKET_ITEMS)
  );
  const [itemFilter, setItemFilter] = useState("");
  const selected = useMemo(() => {
    const hit = pool.find((it) => it.id === itemId);
    if (hit) return hit;
    return pool[0] ?? getDefaultMarketItemForUi();
  }, [itemId, pool]);

  useEffect(() => {
    if (!pool.some((it) => it.id === itemId)) {
      setItemId(initialMarketTabItemIdFrom(pool));
    }
  }, [pool, itemId]);

  const { shownItems, allMatching } = useMemo(() => {
    const q = itemFilter.trim().toLowerCase();
    const all = q
      ? pool.filter((it) =>
          marketItemSearchBlob(it, locale).toLowerCase().includes(q)
        )
      : [...pool];
    return { allMatching: all, shownItems: all.slice(0, 120) };
  }, [itemFilter, pool, locale]);
  const [newsAuto, setNewsAuto] = useState("");
  const [newsLoading, setNewsLoading] = useState(true);
  const [weatherSnap, setWeatherSnap] = useState<CurrentWeatherSnapshot | null>(
    null
  );
  const [weatherCoords, setWeatherCoords] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [mlDetail, setMlDetail] = useState<MlNextDayDetail | null>(null);
  const [adviceDetailOpen, setAdviceDetailOpen] = useState(false);
  const [mlErr, setMlErr] = useState<string | null>(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlOfflineDemo, setMlOfflineDemo] = useState(false);

  const mlBase = getMlApiBaseUrl();
  const mlRunRef = useRef(0);

  const chartSeries = useMemo(
    () => riceMidSeriesForChartDisplay(selected),
    [selected]
  );

  const prediction = useMemo(
    () =>
      predictItemPrice(selected, {
        newsText: newsAuto.trim() || undefined,
        weatherCode: weatherSnap?.weatherCode,
        temperatureC: weatherSnap?.temperatureC,
      }),
    [selected, newsAuto, weatherSnap?.weatherCode, weatherSnap?.temperatureC]
  );

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
        if (!cancelled) {
          setWeatherSnap(w);
          setWeatherCoords({ lat: y.latitude, lon: y.longitude });
        }
      };
      try {
        const loc = await resolveCoordsForWeather();
        if (!loc.ok) {
          await applyYangon();
          return;
        }
        const w = await fetchCurrentWeather(loc.latitude, loc.longitude);
        if (!cancelled) {
          setWeatherSnap(w);
          setWeatherCoords({ lat: loc.latitude, lon: loc.longitude });
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
    if (!weatherSnap || newsLoading) return;
    const prices = recentMidPricesForInference(selected, 8);
    if (!prices) {
      setMlErr(t("market.mlBackendNeedHistory"));
      return;
    }
    const runId = ++mlRunRef.current;
    setMlLoading(true);
    setMlErr(null);
    setMlDetail(null);
    setMlOfflineDemo(false);
    setAdviceDetailOpen(false);
    const headline = mlNewsHeadlineForItem(
      newsAuto.trim() || ML_HEADLINE_FALLBACK,
      selected
    );
    const rawMids = observationMidsOldestToNewest(selected);
    const momentum =
      rawMids.length >= 8
        ? midPriceMomentumPct(rawMids.slice(-8))
        : null;
    const offlineDetail = prediction
      ? buildOfflineMlDetail(prediction, weatherSnap, momentum)
      : null;
    if (!mlBase) {
      if (offlineDetail) {
        setMlDetail(offlineDetail);
        setMlOfflineDemo(true);
      } else {
        setMlErr(t("market.mlBackendNoUrl"));
      }
      setMlLoading(false);
      return;
    }
    const rainMm = rainfallMmHintFromWeatherCode(weatherSnap.weatherCode);
    const newsSlices = newsHeadlinesForMlHistory(headline, 30);
    let cancelled = false;
    void (async () => {
      let rainHist: number[] | undefined;
      let tempHist: number[] | undefined;
      try {
        if (weatherCoords) {
          const h = await fetchWeatherHistoryDaily(
            weatherCoords.lat,
            weatherCoords.lon,
            30
          );
          rainHist = h.rainMm;
          tempHist = h.tempC;
        }
      } catch {
        /* scalar fallback */
      }
      if (cancelled) return;
      fetchMlNextDayDetail({
        avgPrices: prices,
        marketItemId: selected.id,
        rainfallMm: rainMm,
        tempC: weatherSnap.temperatureC,
        newsHeadline: headline,
        rainfallMmHistory: rainHist,
        tempCHistory: tempHist,
        newsHeadlinesHistory: newsSlices,
        fallbackMomentum: momentum,
      })
        .then((d) => {
          if (mlRunRef.current === runId) {
            setMlDetail(d);
            setMlOfflineDemo(false);
          }
        })
        .catch((e) => {
          if (mlRunRef.current === runId) {
            if (offlineDetail) {
              setMlDetail(offlineDetail);
              setMlOfflineDemo(true);
              setMlErr(null);
            } else {
              setMlErr(
                e instanceof Error ? e.message : t("errors.mlBackend")
              );
            }
          }
        })
        .finally(() => {
          if (mlRunRef.current === runId) setMlLoading(false);
        });
    })();
    return () => {
      cancelled = true;
    };
  }, [mlBase, selected, weatherSnap, newsAuto, newsLoading, t, weatherCoords, prediction]);

  const newsLines = useMemo(
    () => riceNewsContextToLines(newsAuto, 8),
    [newsAuto]
  );
  const usedPlaceholderNews = !newsAuto.trim();
  const screenVerdictLabel = useMemo(
    () =>
      verdictLabelForLocale(
        locale,
        blendScreenNewsVerdictWithMomentum(
          screenNewsVerdict(prediction?.factors.newsVerdict),
          mlDetail?.priceChange1dPct,
          mlDetail?.priceChange7dPct
        )
      ),
    [
      locale,
      prediction?.factors.newsVerdict,
      mlDetail?.priceChange1dPct,
      mlDetail?.priceChange7dPct,
    ]
  );

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

  const displayForecastRange = useMemo(() => {
    if (!prediction) return null;
    if (mlForecastKyat)
      return { low: mlForecastKyat.low, high: mlForecastKyat.high };
    return {
      low: prediction.predictedLow,
      high: prediction.predictedHigh,
    };
  }, [prediction, mlForecastKyat]);

  const adviceItemLabel = useMemo(
    () => marketItemLabelForLocale(selected, locale),
    [selected, locale]
  );
  const showMlEvaluating =
    mlBase && !mlErr && mlDetail == null && (mlLoading || newsLoading || !weatherSnap);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {!hideTitle ? (
        <View style={styles.titleRow}>
          <Ionicons
            name="storefront-outline"
            size={28}
            color={theme.accent}
            style={styles.titleIcon}
          />
          <UiText style={styles.pageTitle}>{t("market.title")}</UiText>
        </View>
      ) : null}
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
              <UiText style={styles.itemRowTitle}>
                {marketItemLabelForLocale(it, locale)}
              </UiText>
              <UiText style={styles.itemRowMeta}>{it.itemCategory}</UiText>
            </Pressable>
          ))}
        </ScrollView>

        <UiText style={styles.resultLabel}>{t("market.selected")}</UiText>
        <UiText style={styles.detailTitle}>
          {marketItemLabelForLocale(selected, locale)}
        </UiText>
        <UiText style={styles.meta}>
          {marketItemMetaLineForLocale(selected, locale)}
        </UiText>

        <UiText style={styles.resultLabel}>{t("market.chartTitle")}</UiText>
        <PriceHistoryChartMobile series={chartSeries} locale={locale} />

        {displayForecastMid != null && prediction ? (
          <View style={styles.prediction}>
            <UiText style={styles.resultLabel}>
              {t("market.forecastPriceTitle")}
            </UiText>
            <UiText style={styles.predMid}>
              {formatMmks(displayForecastMid)} {t("common.mmk")}
            </UiText>
            {displayForecastRange ? (
              <UiText style={styles.predRange}>
                {tf("market.forecastPriceRange", {
                  low: formatMmks(displayForecastRange.low),
                  high: formatMmks(displayForecastRange.high),
                })}
              </UiText>
            ) : null}
            <UiText style={styles.dateCaption}>
              {mlDetail != null
                ? tf("market.forecastConfidenceMl", {
                    pct: Math.round(mlDetail.confidenceHint * 100),
                  })
                : mlLoading
                  ? t("market.forecastConfidenceLoading")
                  : t("market.forecastConfidenceNoMl")}
            </UiText>
          </View>
        ) : null}

        <View style={styles.mlBlock}>
          <UiText style={styles.resultLabel}>{t("market.adviceTitle")}</UiText>
          <>
            {showMlEvaluating ? (
              <UiText style={styles.meta}>{t("market.mlBackendLoading")}</UiText>
            ) : null}
            {mlOfflineDemo ? (
              <UiText style={styles.meta}>{t("market.mlOfflineDemoNote")}</UiText>
            ) : null}
            {!mlBase && !mlDetail && !mlErr ? (
              <UiText style={styles.hintTight}>{t("market.mlBackendNoUrl")}</UiText>
            ) : null}
            {mlErr ? <UiText style={styles.mlErr}>{mlErr}</UiText> : null}
            {mlDetail != null && weatherSnap ? (
              <>
                <MlAdviceRow
                  advice={adviceFromMlNextDayPct(
                    mlDetail.nextDayPctChange,
                    {
                      priceChange1dPct: mlDetail.priceChange1dPct,
                      priceChange7dPct: mlDetail.priceChange7dPct,
                    }
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
                    itemLabel={adviceItemLabel}
                    newsLines={newsLines}
                    weatherSnap={weatherSnap}
                    screenVerdictLabel={screenVerdictLabel}
                    usedPlaceholderNews={usedPlaceholderNews}
                  />
                ) : null}
              </>
            ) : null}
          </>
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
    marginBottom: 4,
    lineHeight: myLh(24),
  },
  predRange: {
    fontSize: 13,
    color: theme.fgMuted,
    marginBottom: 8,
    lineHeight: myLh(13),
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
});
