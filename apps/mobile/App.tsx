import type { AppStringKey } from "@agriora/core";
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
import { MarketTab } from "./MarketTab";
import { NewsTab } from "./NewsTab";
import { SettingsTab } from "./SettingsTab";
import { HomeFarmShowcase } from "./HomeFarmShowcase";
import { WeatherTab } from "./WeatherTab";
import { myLh, theme } from "./theme";
import { UiText } from "./UiText";

type Tab = "home" | "market" | "weather" | "news" | "settings";

function AgrioraLogo({ width }: { width: number }) {
  return (
    <Image
      source={require("./assets/agriora-logo.png")}
      style={{ width, height: width, resizeMode: "contain" }}
      accessibilityLabel="Agriora"
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
  const homePill = t("home.pill");
  const homeTag = t("home.tag");

  const tabbarTabs: { id: Tab; labelKey: AppStringKey }[] = [
    { id: "home", labelKey: "tab.home" },
    { id: "market", labelKey: "tab.market" },
    { id: "settings", labelKey: "tab.settings" },
  ];

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.main}>
        <TabTransition tabKey={tab}>
        {tab === "home" && (
          <View style={styles.center}>
            <HomeFarmShowcase />
            <View style={styles.logoWrap}>
              <AgrioraLogo width={220} />
            </View>
            {homeTag ? <UiText style={styles.tag}>{homeTag}</UiText> : null}
            {homePill ? (
              <View style={styles.pill}>
                <UiText style={styles.pillText}>{homePill}</UiText>
              </View>
            ) : null}
            <View style={styles.homeQuickActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.homeQuickBtn,
                  pressed && styles.homeQuickBtnPressed,
                ]}
                onPress={() => setTab("news")}
                accessibilityRole="button"
                accessibilityLabel={t("tab.news")}
              >
                <Ionicons
                  name={tabIcons.news}
                  size={28}
                  color={theme.accent}
                />
                <UiText style={styles.homeQuickLabel}>{t("tab.news")}</UiText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.homeQuickBtn,
                  pressed && styles.homeQuickBtnPressed,
                ]}
                onPress={() => setTab("weather")}
                accessibilityRole="button"
                accessibilityLabel={t("tab.weather")}
              >
                <Ionicons
                  name={tabIcons.weather}
                  size={28}
                  color={theme.accent}
                />
                <UiText style={styles.homeQuickLabel}>{t("tab.weather")}</UiText>
              </Pressable>
            </View>
          </View>
        )}

        {tab === "market" && <MarketTab />}

        {tab === "weather" && <WeatherTab isActive={tab === "weather"} />}

        {tab === "news" && <NewsTab isActive={tab === "news"} />}

        {tab === "settings" && <SettingsTab />}
        </TabTransition>
      </View>

      <View style={styles.tabbar}>
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
    gap: 12,
    marginTop: 28,
    width: "100%",
    maxWidth: 340,
    paddingHorizontal: 8,
  },
  homeQuickBtn: {
    flex: 1,
    minHeight: 100,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.accentBorder,
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
});
