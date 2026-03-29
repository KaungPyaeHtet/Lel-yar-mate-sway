import type { AppStringKey } from "@agriora/core";
import { useState } from "react";
import "./App.css";
import {
  IconHome,
  IconMarket,
  IconNews,
  IconSettings,
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
  const homePill = t("home.pill");

  const tabbarTabs: { id: Tab; labelKey: AppStringKey }[] = [
    { id: "home", labelKey: "tab.home" },
    { id: "market", labelKey: "tab.market" },
    { id: "settings", labelKey: "tab.settings" },
  ];

  return (
    <div className="app">
      <main className="main">
        {tab === "home" && (
          <div className="hero">
            <h1 className="logo-mark">
              <img
                className="logo-img"
                src="/agriora-logo.png"
                alt="Agriora"
                width={512}
                height={512}
                decoding="async"
              />
            </h1>
            {homePill ? <span className="pill">{homePill}</span> : null}
            <div className="home-quick-actions">
              <button
                type="button"
                className="home-quick-btn"
                onClick={() => setTab("news")}
              >
                <IconNews className="home-quick-icon" aria-hidden />
                <span className="home-quick-label">{t("tab.news")}</span>
              </button>
              <button
                type="button"
                className="home-quick-btn"
                onClick={() => setTab("weather")}
              >
                <IconWeather className="home-quick-icon" aria-hidden />
                <span className="home-quick-label">{t("tab.weather")}</span>
              </button>
            </div>
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
        {tabbarTabs.map(({ id, labelKey }) => {
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
