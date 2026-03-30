import type { AppStringKey } from "@agriora/core";
import { useEffect, useState } from "react";
import "./App.css";
import {
  IconHome,
  IconMarket,
  IconNews,
  IconSettings,
  IconWeather,
} from "./icons";
import { LocaleProvider, useI18n } from "./LocaleContext";
import { FarmingPanel } from "./FarmingPanel";
import { NewsPanel } from "./NewsPanel";
import { SettingsPanel } from "./SettingsPanel";
import { WeatherPanel } from "./WeatherPanel";

type Tab = "home" | "market" | "weather" | "news" | "settings";
const WEB_TUTORIAL_SEEN_KEY = "agriora.tutorial.seen.v1";

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

  useEffect(() => {
    try {
      const seen = localStorage.getItem(WEB_TUTORIAL_SEEN_KEY);
      if (seen !== "1") {
        setTutorialOpen(true);
        setTutorialStep(0);
        setTab("home");
      }
    } catch {
      setTutorialOpen(true);
      setTutorialStep(0);
      setTab("home");
    }
  }, []);

  function dismissTutorial() {
    setTutorialOpen(false);
    try {
      localStorage.setItem(WEB_TUTORIAL_SEEN_KEY, "1");
    } catch {
      /* noop */
    }
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

  const tabbarTabs: { id: Tab; labelKey: AppStringKey }[] = [
    { id: "home", labelKey: "tab.home" },
    { id: "market", labelKey: "tab.market" },
    { id: "settings", labelKey: "tab.settings" },
  ];

  return (
    <div className="app">
      <main className="main">
        <div key={tab} className="main-panel">
        {tab === "home" && (
          <div className="hero">
            <div className="hero-shell">
              <h1 className="logo-mark">
                <img
                  className="logo-img"
                  src="/agriora-logo.png"
                  alt="လယ်ယာမိတ်ဆွေ"
                  width={512}
                  height={512}
                  decoding="async"
                />
              </h1>
              {homeTag ? <p className="hero-tag">{homeTag}</p> : null}
              {homePill ? <span className="pill">{homePill}</span> : null}
              <div className="home-quick-actions">
                <button
                  type="button"
                  className="home-quick-btn"
                  onClick={() => setTab("market")}
                >
                  <IconMarket className="home-quick-icon" aria-hidden />
                  <span className="home-quick-label">{t("tab.market")}</span>
                </button>
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
          </div>
        )}

        {tab === "market" && <FarmingPanel />}

        {tab === "weather" && (
          <WeatherPanel isActive={tab === "weather"} />
        )}

        {tab === "news" && <NewsPanel isActive={tab === "news"} />}

        {tab === "settings" && <SettingsPanel />}
        </div>
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
      {tutorialOpen ? (
        <div className="tutorial-overlay" role="dialog" aria-modal="true">
          <div className="tutorial-card">
            <h2 className="tutorial-title">{t("tutorial.title")}</h2>
            <p className="tutorial-step-index">
              {tutorialStep + 1} / {tutorialSteps.length}
            </p>
            <p className="tutorial-current">{t(tutorialTarget.text)}</p>
            <div className="tutorial-actions">
              <button
                type="button"
                className="btn btn-secondary tutorial-btn-half"
                onClick={prevTutorialStep}
                disabled={tutorialStep === 0}
              >
                {t("tutorial.back")}
              </button>
              <button
                type="button"
                className="btn tutorial-btn-half"
                onClick={nextTutorialStep}
              >
                {tutorialStep + 1 >= tutorialSteps.length
                  ? t("tutorial.done")
                  : t("tutorial.next")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
