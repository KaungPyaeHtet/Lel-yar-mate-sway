import type { AppStringKey } from "@agriora/core";
import { useState } from "react";
import "./App.css";
import { LocaleProvider, useI18n } from "./LocaleContext";
import { MarketPanel } from "./MarketPanel";
import { NewsPanel } from "./NewsPanel";
import { SettingsPanel } from "./SettingsPanel";
import { WeatherPanel } from "./WeatherPanel";

type Tab = "home" | "market" | "weather" | "news" | "settings";

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
    <div className="app">
      <main className="main">
        {tab === "home" && (
          <div className="hero">
            <h1 className="logo">Agriora</h1>
            <p className="tag">{t("home.tag")}</p>
            <span className="pill">{t("home.pill")}</span>
          </div>
        )}

        {tab === "market" && <MarketPanel />}

        {tab === "weather" && (
          <WeatherPanel isActive={tab === "weather"} />
        )}

        {tab === "news" && <NewsPanel isActive={tab === "news"} />}

        {tab === "settings" && <SettingsPanel />}
      </main>

      <nav className="tabbar" aria-label={t("nav.mainAria")}>
        {tabs.map(({ id, labelKey }) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "tab active" : "tab"}
            onClick={() => setTab(id)}
          >
            {t(labelKey)}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <LocaleProvider>
      <AppShell />
    </LocaleProvider>
  );
}
