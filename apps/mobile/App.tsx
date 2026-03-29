import type { AppStringKey } from "@agriora/core";
import Ionicons from "@expo/vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";
import { useState, type ComponentProps } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { LocaleProvider, useI18n } from "./LocaleContext";
import { MarketTab } from "./MarketTab";
import { NewsTab } from "./NewsTab";
import { SettingsTab } from "./SettingsTab";
import { WeatherTab } from "./WeatherTab";
import { theme } from "./theme";

type Tab = "home" | "market" | "weather" | "news" | "settings";

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

  const tabbarTabs: { id: Tab; labelKey: AppStringKey }[] = [
    { id: "home", labelKey: "tab.home" },
    { id: "market", labelKey: "tab.market" },
    { id: "settings", labelKey: "tab.settings" },
  ];

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.main}>
        {tab === "home" && (
          <View style={styles.center}>
            <View style={styles.logoWrap}>
              <AgrioraLogo width={280} />
            </View>
            {homePill ? (
              <View style={styles.pill}>
                <Text style={styles.pillText}>{homePill}</Text>
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
                <Text style={styles.homeQuickLabel}>{t("tab.news")}</Text>
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
                <Text style={styles.homeQuickLabel}>{t("tab.weather")}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {tab === "market" && <MarketTab />}

        {tab === "weather" && <WeatherTab isActive={tab === "weather"} />}

        {tab === "news" && <NewsTab isActive={tab === "news"} />}

        {tab === "settings" && <SettingsTab />}
      </View>

      <View style={styles.tabbar}>
        {tabbarTabs.map(({ id, labelKey }) => {
          const active = tab === id;
          return (
            <Pressable
              key={id}
              style={styles.tab}
              onPress={() => setTab(id)}
            >
              <Ionicons
                name={tabIcons[id]}
                size={26}
                color={active ? theme.accent : theme.fgMuted}
              />
              <Text
                style={[styles.tabText, active && styles.tabTextActive]}
                numberOfLines={1}
              >
                {t(labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function App() {
  return (
    <LocaleProvider>
      <AppShell />
    </LocaleProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  main: { flex: 1, paddingTop: 52 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  logoImg: {
    width: 236,
    height: 236,
    resizeMode: "contain",
    marginBottom: 4,
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
  },
  tabbar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: theme.tabBarBorder,
    paddingBottom: 22,
    paddingTop: 10,
    backgroundColor: theme.tabBarBg,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    minHeight: 52,
    justifyContent: "center",
    gap: 4,
  },
  tabText: {
    color: theme.fgMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  tabTextActive: { color: theme.accent },
});
