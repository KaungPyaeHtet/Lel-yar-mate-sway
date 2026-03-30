import type { AppStringKey } from "@agriora/core";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";
import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import {
  NotoSansMyanmar_400Regular,
  NotoSansMyanmar_500Medium,
  NotoSansMyanmar_600SemiBold,
  NotoSansMyanmar_700Bold,
  useFonts,
} from "@expo-google-fonts/noto-sans-myanmar";
import { LocaleProvider, useI18n } from "./LocaleContext";
import { FarmingTab } from "./FarmingTab";
import { NewsTab } from "./NewsTab";
import { SettingsTab } from "./SettingsTab";
import { WeatherTab } from "./WeatherTab";
import { myLh, theme } from "./theme";
import { UiText } from "./UiText";

type Tab = "home" | "market" | "weather" | "news" | "settings";
const MOBILE_TUTORIAL_SEEN_KEY = "agriora.tutorial.seen.v1";

function AgrioraLogo({ width }: { width: number }) {
  return (
    <Image
      source={require("./assets/agriora-logo.png")}
      style={{ width, height: width, resizeMode: "contain" }}
      accessibilityLabel="လယ်ယာမိတ်ဆွေ"
    />
  );
}

function TabTransition({
  tabKey,
  children,
}: {
  tabKey: Tab;
  children: ReactNode;
}) {
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const isFirstTab = useRef(true);

  useEffect(() => {
    if (isFirstTab.current) {
      isFirstTab.current = false;
      return;
    }

    let cancelled = false;

    const run = async () => {
      const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
      if (cancelled) return;

      if (reduceMotion) {
        opacity.setValue(1);
        translateY.setValue(0);
        return;
      }

      opacity.setValue(0);
      translateY.setValue(14);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [tabKey, opacity, translateY]);

  return (
    <Animated.View
      style={[styles.mainFill, { opacity, transform: [{ translateY }] }]}
    >
      {children}
    </Animated.View>
  );
}

const tabIcons: Record<Tab, ComponentProps<typeof Ionicons>["name"]> = {
  home: "home-outline",
  market: "storefront-outline",
  weather: "partly-sunny-outline",
  news: "newspaper-outline",
  settings: "settings-outline",
};

function AppShell() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("home");
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const homePill = t("home.pill");
  const homeTag = t("home.tag");
  const tutorialSteps: Array<{ tab: Tab; text: AppStringKey }> = [
    { tab: "market", text: "tutorial.step1" },
    { tab: "home", text: "tutorial.step2" },
    { tab: "settings", text: "tutorial.step3" },
  ];
  const tutorialTarget = tutorialSteps[tutorialStep] ?? tutorialSteps[0]!;
  const { width, height } = useWindowDimensions();
  const isCompact = width < 360;
  const isShort = height < 700;
  const isTablet = width >= 768;
  const logoWidth = Math.max(168, Math.min(width * 0.56, isTablet ? 300 : 250));
  const quickIconSize = isCompact ? 24 : 27;

  const tabbarTabs: { id: Tab; labelKey: AppStringKey }[] = [
    { id: "home", labelKey: "tab.home" },
    { id: "market", labelKey: "tab.market" },
    { id: "settings", labelKey: "tab.settings" },
  ];

  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(MOBILE_TUTORIAL_SEEN_KEY).then((seen) => {
      if (!alive) return;
      if (seen !== "1") {
        setTutorialOpen(true);
        setTutorialStep(0);
        setTab("home");
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  function dismissTutorial() {
    setTutorialOpen(false);
    void AsyncStorage.setItem(MOBILE_TUTORIAL_SEEN_KEY, "1");
  }

  function nextTutorialStep() {
    const next = tutorialStep + 1;
    if (next >= tutorialSteps.length) {
      dismissTutorial();
      return;
    }
    setTutorialStep(next);
    setTab(tutorialSteps[next]!.tab);
  }

  function prevTutorialStep() {
    const prev = tutorialStep - 1;
    if (prev < 0) return;
    setTutorialStep(prev);
    setTab(tutorialSteps[prev]!.tab);
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.main}>
        <TabTransition tabKey={tab}>
        {tab === "home" && (
          <View
            style={[
              styles.center,
              isCompact && styles.centerCompact,
              isShort && styles.centerShort,
            ]}
          >
            <View
              style={[
                styles.heroCard,
                isCompact && styles.heroCardCompact,
                isTablet && styles.heroCardTablet,
              ]}
            >
            <View style={styles.logoWrap}>
              <AgrioraLogo width={logoWidth} />
            </View>
            {homeTag ? <UiText style={styles.tag}>{homeTag}</UiText> : null}
            {homePill ? (
              <View style={styles.pill}>
                <UiText style={styles.pillText}>{homePill}</UiText>
              </View>
            ) : null}
            <View
              style={[
                styles.homeQuickActions,
                isCompact && styles.homeQuickActionsCompact,
                isTablet && styles.homeQuickActionsTablet,
              ]}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.homeQuickBtn,
                  isCompact && styles.homeQuickBtnCompact,
                  pressed && styles.homeQuickBtnPressed,
                ]}
                onPress={() => setTab("market")}
                accessibilityRole="button"
                accessibilityLabel={t("tab.market")}
                hitSlop={6}
              >
                <Ionicons
                  name={tabIcons.market}
                  size={quickIconSize}
                  color={theme.accent}
                />
                <UiText style={styles.homeQuickLabel}>{t("tab.market")}</UiText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.homeQuickBtn,
                  isCompact && styles.homeQuickBtnCompact,
                  pressed && styles.homeQuickBtnPressed,
                ]}
                onPress={() => setTab("news")}
                accessibilityRole="button"
                accessibilityLabel={t("tab.news")}
                hitSlop={6}
              >
                <Ionicons
                  name={tabIcons.news}
                  size={quickIconSize}
                  color={theme.accent}
                />
                <UiText style={styles.homeQuickLabel}>{t("tab.news")}</UiText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.homeQuickBtn,
                  isCompact && styles.homeQuickBtnCompact,
                  pressed && styles.homeQuickBtnPressed,
                ]}
                onPress={() => setTab("weather")}
                accessibilityRole="button"
                accessibilityLabel={t("tab.weather")}
                hitSlop={6}
              >
                <Ionicons
                  name={tabIcons.weather}
                  size={quickIconSize}
                  color={theme.accent}
                />
                <UiText style={styles.homeQuickLabel}>{t("tab.weather")}</UiText>
              </Pressable>
            </View>
            </View>
          </View>
        )}

        {tab === "market" && <FarmingTab />}

        {tab === "weather" && <WeatherTab isActive={tab === "weather"} />}

        {tab === "news" && <NewsTab isActive={tab === "news"} />}

        {tab === "settings" && <SettingsTab />}
        </TabTransition>
      </View>

      <View
        style={[
          styles.tabbar,
          isCompact && styles.tabbarCompact,
          isTablet && styles.tabbarTablet,
        ]}
      >
        {tabbarTabs.map(({ id, labelKey }) => {
          const active = tab === id;
          return (
            <Pressable
              key={id}
              style={({ pressed }) => [
                styles.tab,
                pressed && styles.tabPressed,
              ]}
              android_ripple={{ color: "rgba(27, 107, 54, 0.2)" }}
              onPress={() => setTab(id)}
            >
              <Ionicons
                name={tabIcons[id]}
                size={26}
                color={active ? theme.accent : theme.fgMuted}
              />
              <UiText
                style={[styles.tabText, active && styles.tabTextActive]}
                numberOfLines={2}
                adjustsFontSizeToFit={false}
              >
                {t(labelKey)}
              </UiText>
            </Pressable>
          );
        })}
      </View>
      {tutorialOpen ? (
        <View style={styles.tutorialOverlay}>
          <View style={styles.tutorialCard}>
            <UiText style={styles.tutorialTitle}>{t("tutorial.title")}</UiText>
            <UiText style={styles.tutorialStepIndex}>
              {tutorialStep + 1} / {tutorialSteps.length}
            </UiText>
            <View style={styles.tutorialList}>
              <UiText style={styles.tutorialItem}>{t(tutorialTarget.text)}</UiText>
            </View>
            <View style={styles.tutorialActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.tutorialBtnSecondary,
                  tutorialStep === 0 && styles.tutorialBtnDisabled,
                  pressed && styles.tutorialBtnPressed,
                ]}
                onPress={prevTutorialStep}
                disabled={tutorialStep === 0}
                accessibilityRole="button"
                accessibilityLabel={t("tutorial.back")}
              >
                <UiText style={styles.tutorialBtnSecondaryText}>
                  {t("tutorial.back")}
                </UiText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.tutorialBtn,
                  pressed && styles.tutorialBtnPressed,
                ]}
                onPress={nextTutorialStep}
                accessibilityRole="button"
                accessibilityLabel={
                  tutorialStep + 1 >= tutorialSteps.length
                    ? t("tutorial.done")
                    : t("tutorial.next")
                }
              >
                <UiText style={styles.tutorialBtnText}>
                  {tutorialStep + 1 >= tutorialSteps.length
                    ? t("tutorial.done")
                    : t("tutorial.next")}
                </UiText>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function AppBootstrap() {
  const [fontsLoaded] = useFonts({
    NotoSansMyanmar_400Regular,
    NotoSansMyanmar_500Medium,
    NotoSansMyanmar_600SemiBold,
    NotoSansMyanmar_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.fontLoading}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <LocaleProvider>
      <AppShell />
    </LocaleProvider>
  );
}

export default AppBootstrap;

const styles = StyleSheet.create({
  fontLoading: {
    flex: 1,
    backgroundColor: theme.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  root: { flex: 1, backgroundColor: theme.bg },
  main: { flex: 1, paddingTop: 52 },
  mainFill: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  centerCompact: { paddingHorizontal: 14, paddingVertical: 14 },
  centerShort: { justifyContent: "flex-start", paddingTop: 8 },
  heroCard: {
    width: "100%",
    maxWidth: 620,
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  heroCardCompact: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  heroCardTablet: {
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  tag: {
    marginTop: 14,
    color: theme.fgMuted,
    textAlign: "center",
    lineHeight: myLh(16),
    fontSize: 16,
    paddingHorizontal: 8,
  },
  pill: {
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.accentSoft,
    borderWidth: 1,
    borderColor: theme.accentBorder,
  },
  pillText: {
    color: theme.accent,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  homeQuickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 28,
    width: "100%",
    maxWidth: 540,
    paddingHorizontal: 8,
  },
  homeQuickActionsCompact: {
    gap: 10,
    marginTop: 16,
    paddingHorizontal: 0,
  },
  homeQuickActionsTablet: {
    gap: 14,
    marginTop: 20,
  },
  homeQuickBtn: {
    flexGrow: 1,
    flexBasis: "30%",
    minHeight: 82,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.accentBorder,
  },
  homeQuickBtnCompact: {
    flexBasis: "100%",
    minHeight: 64,
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingHorizontal: 14,
  },
  homeQuickBtnPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  homeQuickLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.fg,
    textAlign: "center",
    lineHeight: myLh(15),
    paddingHorizontal: 4,
  },
  tabbar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: theme.tabBarBorder,
    paddingBottom: 24,
    paddingTop: 8,
    backgroundColor: theme.tabBarBg,
  },
  tabbarCompact: {
    paddingBottom: 18,
    paddingTop: 6,
  },
  tabbarTablet: {
    paddingBottom: 28,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    minHeight: 56,
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 4,
  },
  tabPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  tabText: {
    color: theme.fgMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
    textAlign: "center",
    lineHeight: myLh(11),
  },
  tabTextActive: { color: theme.accent },
  tutorialOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    backgroundColor: "rgba(14,24,15,0.52)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  tutorialCard: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    padding: 16,
  },
  tutorialTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.fg,
    marginBottom: 10,
    lineHeight: myLh(18),
  },
  tutorialList: { gap: 8 },
  tutorialStepIndex: {
    color: theme.fgMuted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: myLh(13),
    marginBottom: 8,
  },
  tutorialItem: {
    color: theme.fg,
    fontSize: 15,
    lineHeight: myLh(15),
  },
  tutorialActions: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },
  tutorialBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: theme.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  tutorialBtnPressed: { opacity: 0.92 },
  tutorialBtnSecondary: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.accentBorder,
    backgroundColor: theme.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  tutorialBtnDisabled: {
    opacity: 0.45,
  },
  tutorialBtnSecondaryText: {
    color: theme.accent,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: myLh(15),
  },
  tutorialBtnText: {
    color: theme.onAccent,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: myLh(15),
  },
});
