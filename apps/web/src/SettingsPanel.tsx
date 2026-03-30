import type { AppLocale, AppStringKey } from "@agriora/core";
import {
  IconGlobeSimple,
  IconInformation,
  IconLanguage,
  IconSettings,
} from "./icons";
import { useI18n } from "./LocaleContext";

export function SettingsPanel() {
  const { locale, setLocale, t } = useI18n();
  const faqRows: Array<{ q: AppStringKey; a: AppStringKey }> = [
    { q: "about.faqQ1", a: "about.faqA1" },
    { q: "about.faqQ2", a: "about.faqA2" },
    { q: "about.faqQ3", a: "about.faqA3" },
  ];

  function pick(next: AppLocale) {
    setLocale(next);
  }

  return (
    <div className="panel">
      <div className="page-title-row">
        <IconSettings className="panel-icon" aria-hidden />
        <h2 className="page-title">{t("settings.title")}</h2>
      </div>

      <div className="card settings-lang">
        <p className="result-label settings-label-row">
          <IconGlobeSimple className="chip-icon" aria-hidden />
          {t("settings.languageTitle")}
        </p>
        <div className="lang-row">
          <button
            type="button"
            className={locale === "my" ? "lang-btn active" : "lang-btn"}
            onClick={() => pick("my")}
          >
            <IconLanguage className="chip-icon" aria-hidden />
            {t("settings.languageMy")}
          </button>
          <button
            type="button"
            className={locale === "en" ? "lang-btn active" : "lang-btn"}
            onClick={() => pick("en")}
          >
            <span className="lang-en-icon" aria-hidden>
              Aa
            </span>
            {t("settings.languageEn")}
          </button>
        </div>
      </div>

      <div className="subheading-row">
        <IconInformation className="panel-icon" aria-hidden />
        <h3 className="subheading">{t("about.title")}</h3>
      </div>
      <div className="card">
        <p className="body about-body-my">{t("about.body")}</p>
      </div>

      <h3 className="subheading">{t("about.faqTitle")}</h3>
      <div className="card faq-card">
        {faqRows.map(({ q, a }, idx) => (
          <div key={q} className="faq-item">
            <p className="faq-q">
              Q{idx + 1}. {t(q)}
            </p>
            <p className="faq-a">{t(a)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
