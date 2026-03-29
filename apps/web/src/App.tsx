import type { AppStringKey } from "@agriora/core";
import { useState } from "react";
import "./App.css";
import {
  IconHome,
  IconMarket,
  IconNews,
  IconSettings,
  IconSprout,
  IconWeather,
} from "./icons";
import { LocaleProvider, useI18n } from "./LocaleContext";
import { MarketPanel } from "./MarketPanel";
import { NewsPanel } from "./NewsPanel";
import { SettingsPanel } from "./SettingsPanel";
import { WeatherPanel } from "./WeatherPanel";

type Tab = "home" | "market" | "weather" | "news" | "settings";

const tabIcons = {
  home: IconHome,
  market: IconMarket,
  weather: IconWeather,
  news: IconNews,
  settings: IconSettings,
} as const;

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
    <div className="app">
      <main className="main">
        {tab === "home" && (
          <div className="hero">
            <IconSprout className="hero-sprout" aria-hidden />
            <h1 className="logo">Agriora</h1>
            {homeTag ? <p className="tag">{homeTag}</p> : null}
            {homePill ? <span className="pill">{homePill}</span> : null}
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
        {tabs.map(({ id, labelKey }) => {
          const Icon = tabIcons[id];
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              className={active ? "tab active" : "tab"}
              onClick={() => setTab(id)}
            >
              <span className="tab-inner">
                <Icon className="tab-icon" aria-hidden />
                <span>{t(labelKey)}</span>
              </span>
            </button>
          );
        })}
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
