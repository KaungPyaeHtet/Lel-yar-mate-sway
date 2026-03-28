import type { AppLocale } from "@agriora/core";
import { useI18n } from "./LocaleContext";

export function SettingsPanel() {
  const { locale, setLocale, t } = useI18n();

  function pick(next: AppLocale) {
    setLocale(next);
  }

  return (
    <div className="panel">
      <h2 className="page-title">{t("settings.title")}</h2>

      <div className="card settings-lang">
        <p className="result-label">{t("settings.languageTitle")}</p>
        <div className="lang-row">
          <button
            type="button"
            className={locale === "my" ? "lang-btn active" : "lang-btn"}
            onClick={() => pick("my")}
          >
            {t("settings.languageMy")}
          </button>
          <button
            type="button"
            className={locale === "en" ? "lang-btn active" : "lang-btn"}
            onClick={() => pick("en")}
          >
            {t("settings.languageEn")}
          </button>
        </div>
        <p className="hint tight-top">{t("settings.languageNote")}</p>
      </div>

      <h3 className="subheading">{t("about.title")}</h3>
      <div className="card">
        <p className="body about-body-my">{t("about.body")}</p>
      </div>
    </div>
  );
}
