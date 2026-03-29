import type { AppStringKey } from "@agriora/core";
import Ionicons from "@expo/vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";
import { useState, type ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
  const homeTag = t("home.tag");
  const homePill = t("home.pill");

  const tabs: { id: Tab; labelKey: AppStringKey }[] = [
    { id: "home", labelKey: "tab.home" },
    { id: "market", labelKey: "tab.market" },
    { id: "weather", labelKey: "tab.weather" },
    { id: "news", labelKey: "tab.news" },
    { id: "settings", labelKey: "tab.settings" },
  ];

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.main}>
        {tab === "home" && (
          <View style={styles.center}>
            <Ionicons
              name="leaf-outline"
              size={48}
              color={theme.accent}
              style={styles.homeSprout}
            />
            <Text style={styles.logo}>Agriora</Text>
            {homeTag ? <Text style={styles.tag}>{homeTag}</Text> : null}
            {homePill ? (
              <View style={styles.pill}>
                <Text style={styles.pillText}>{homePill}</Text>
              </View>
            ) : null}
          </View>
        )}

        {tab === "market" && <MarketTab />}

        {tab === "weather" && <WeatherTab isActive={tab === "weather"} />}

        {tab === "news" && <NewsTab isActive={tab === "news"} />}

        {tab === "settings" && <SettingsTab />}
      </View>

      <View style={styles.tabbar}>
        {tabs.map(({ id, labelKey }) => {
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
  homeSprout: { marginBottom: 8 },
  logo: {
    fontSize: 44,
    fontWeight: "700",
    color: theme.accent,
    letterSpacing: -1,
  },
  tag: {
    marginTop: 14,
    color: theme.fgMuted,
    textAlign: "center",
    lineHeight: 24,
    fontSize: 16,
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
