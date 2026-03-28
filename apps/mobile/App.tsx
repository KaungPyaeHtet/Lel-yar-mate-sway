import type { AppStringKey } from "@agriora/core";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LocaleProvider, useI18n } from "./LocaleContext";
import { MarketTab } from "./MarketTab";
import { NewsTab } from "./NewsTab";
import { SettingsTab } from "./SettingsTab";
import { WeatherTab } from "./WeatherTab";

type Tab = "home" | "market" | "weather" | "news" | "settings";

const bg = "#0c120f";
const fg = "#e6ede8";
const muted = "rgba(230, 237, 232, 0.55)";
const accent = "#5cb87a";

function AppShell() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("home");

  const tabs: { id: Tab; labelKey: AppStringKey }[] = [
    { id: "home", labelKey: "tab.home" },
    { id: "market", labelKey: "tab.market" },
    { id: "weather", labelKey: "tab.weather" },
    { id: "news", labelKey: "tab.news" },
    { id: "settings", labelKey: "tab.settings" },
  ];

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.main}>
        {tab === "home" && (
          <View style={styles.center}>
            <Text style={styles.logo}>Agriora</Text>
            <Text style={styles.tag}>{t("home.tag")}</Text>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{t("home.pill")}</Text>
            </View>
          </View>
        )}

        {tab === "market" && <MarketTab />}

        {tab === "weather" && <WeatherTab isActive={tab === "weather"} />}

        {tab === "news" && <NewsTab isActive={tab === "news"} />}

        {tab === "settings" && <SettingsTab />}
      </View>

      <View style={styles.tabbar}>
        {tabs.map(({ id, labelKey }) => (
          <Pressable
            key={id}
            style={styles.tab}
            onPress={() => setTab(id)}
          >
            <Text
              style={[styles.tabText, tab === id && styles.tabTextActive]}
            >
              {t(labelKey)}
            </Text>
          </Pressable>
        ))}
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
  root: { flex: 1, backgroundColor: bg },
  main: { flex: 1, paddingTop: 52 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  logo: {
    fontSize: 42,
    fontWeight: "700",
    color: accent,
    letterSpacing: -1,
  },
  tag: { marginTop: 12, color: muted, textAlign: "center", lineHeight: 22 },
  pill: {
    marginTop: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(92, 184, 122, 0.15)",
  },
  pillText: {
    color: accent,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  tabbar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingBottom: 20,
    paddingTop: 10,
    backgroundColor: "rgba(12, 18, 15, 0.96)",
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 6 },
  tabText: { color: muted, fontSize: 10, fontWeight: "600" },
  tabTextActive: { color: accent },
});
