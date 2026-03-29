/** UI locale for Agriora apps (default: Burmese). */

export type AppLocale = "my" | "en";

export const DEFAULT_APP_LOCALE: AppLocale = "my";

export const LOCALE_STORAGE_KEY = "agriora.locale";

export function parseStoredLocale(raw: string | null | undefined): AppLocale {
  if (raw === "en" || raw === "my") return raw;
  return DEFAULT_APP_LOCALE;
}

export type AppStringKey =
  | "tab.home"
  | "tab.market"
  | "tab.weather"
  | "tab.news"
  | "tab.settings"
  | "home.tag"
  | "home.pill"
  | "settings.title"
  | "settings.languageTitle"
  | "settings.languageMy"
  | "settings.languageEn"
  | "settings.languageNote"
  | "about.title"
  | "about.body"
  | "market.title"
  | "market.hint"
  | "market.searchPlaceholder"
  | "market.searchAria"
  | "market.itemsAria"
  | "market.selected"
  | "market.yangonWeather"
  | "market.myLocation"
  | "market.loading"
  | "market.optionalNews"
  | "market.newsPlaceholder"
  | "market.demoForecast"
  | "market.range"
  | "market.baselineMid"
  | "market.factorTrend"
  | "market.factorNews"
  | "market.factorWeather"
  | "market.predictionDisclaimer"
  | "news.title"
  | "news.hint"
  | "news.refresh"
  | "news.loadingHeadlines"
  | "news.filterAria"
  | "news.filterAll"
  | "news.filterMyanmar"
  | "news.filterIntl"
  | "news.addToHint"
  | "news.subheading"
  | "news.hintPaste"
  | "news.placeholder"
  | "news.estimate"
  | "news.resultLabel"
  | "news.blendMeta"
  | "news.addSentence"
  | "news.verdictUp"
  | "news.verdictDown"
  | "news.verdictFlat"
  | "weather.title"
  | "weather.hintWeb"
  | "weather.hintMobile"
  | "weather.openMeteo"
  | "weather.useLocation"
  | "weather.gettingLocation"
  | "weather.nearYou"
  | "weather.nearestListed"
  | "weather.humidity"
  | "weather.wind"
  | "weather.allRegions"
  | "weather.refresh"
  | "weather.loadingForecasts"
  | "weather.failed"
  | "weather.alertPermissionTitle"
  | "weather.alertPermissionBody"
  | "weather.alertErrorTitle"
  | "weather.alertErrorBody"
  | "errors.geoUnsupported"
  | "errors.geoDenied"
  | "errors.geoNeedHttps"
  | "errors.locationServicesOff"
  | "errors.locationTimeout"
  | "errors.weatherLoad"
  | "errors.headlinesLoad"
  | "nav.mainAria"
  | "common.mmk";

const STRINGS: Record<AppLocale, Record<AppStringKey, string>> = {
  my: {
    "tab.home": "ပင်မ",
    "tab.market": "စျေးကွက်",
    "tab.weather": "ရာသီဥတု",
    "tab.news": "သတင်း",
    "tab.settings": "ချိန်ညှိမှု",
    "home.tag": "",
    "home.pill": "",
    "settings.title": "ချိန်ညှိမှု",
    "settings.languageTitle": "ဘာသာစကား",
    "settings.languageMy": "မြန်မာ",
    "settings.languageEn": "အင်္ဂလိပ်",
    "settings.languageNote":
      "ရွေးချယ်မှုကို ဤစက်တွင် သိမ်းထားသည်။ ဝဘ်နှင့် ဖုန်း ခွဲသိမ်းပါသည်။",
    "about.title": "အကြောင်း",
    "about.body":
      "Agriora ဟက်ခါသန်း အဖွဲ့။ ဝဘ်တွင် Vite + React၊ မိုဘိုင်းတွင် Expo။ @agriora/core တွင် data.xlsx ဈေးနှုန်း၊ သတင်း RSS၊ စျေးညွှန်အချက်များ၊ မြန်မာဒေသရာသီဥတု ပါဝင်သည်။ ရာသီဥတု — Open-Meteo။",
    "market.title": "စျေးကွက် ဈေးနှုန်းများ",
    "market.hint":
      "အခြေခံသည် data.xlsx ({count} ကုန်ပစ္စည်း၊ နောက်ဆုံး ထုတ်ယူမှု {generated})။ သတင်းနှင့် ရာသီဥတုဖြင့် ခန့်မှန်းချက်ကို ပြုပြင်သည် — ပညာပေးရန် သာ၊ အကြံပြုချက် မဟုတ်ပါ။",
    "market.searchPlaceholder": "ရှာဖွေရန် (မြန်မာ သို့မဟုတ် အမျိုးအစား)…",
    "market.searchAria": "ကုန်ပစ္စည်း ရှာရန်",
    "market.itemsAria": "ကုန်ပစ္စည်း စာရင်း",
    "market.selected": "ရွေးထားသည်",
    "market.yangonWeather": "ရန်ကုန် ရာသီဥတု",
    "market.myLocation": "ကျွန်ုပ် တည်နေရာ",
    "market.loading": "ဖတ်နေသည်…",
    "market.optionalNews":
      "ထပ်သွင်းရန် သတင်း (စည်းမျဉ်းအတွက် အင်္ဂလိပ် ပိုကောင်း)",
    "market.newsPlaceholder": "ခေါင်းစဉ် သို့မဟုတ် short notes…",
    "market.demoForecast": "ခန့်မှန်းချက် (နမူနာ)",
    "market.range": "အကွာအဝေး",
    "market.baselineMid": "အခြေခံ အလယ်",
    "market.factorTrend": "လမ်းကြောင်း",
    "market.factorNews": "သတင်း",
    "market.factorWeather": "ရာသီဥတု",
    "market.predictionDisclaimer":
      "ပြသရန် မော်ဒယ်သာ — ငွေကြေး၊ ဥပဒေ သို့ စိုက်ပျိုးရေးအကြံ မဟုတ်ပါ။",
    "news.title": "သတင်း",
    "news.hint":
      "BBC မြန်မာ နှင့် RSS အခြားရင်းမြစ်၊ Google News (မြန်မာ/ကမ္ဘာ့ကုန်ဈေး)။ အင်တာနက်လိုအပ်သည်။ ဘရောက်ဆာပိတ်ဆို့လျှင် rss2json သုံးနိုင်သည် (ပြပွဲသာ)။",
    "news.refresh": "ပြန်ဖတ်",
    "news.loadingHeadlines": "ဖတ်နေသည်…",
    "news.filterAria": "ဒေသ စစ်ထုတ်ရန်",
    "news.filterAll": "အားလုံး",
    "news.filterMyanmar": "မြန်မာ / ဒေသ",
    "news.filterIntl": "နိုင်ငံတကာ",
    "news.addToHint": "စျေးညွှန်သို့ ထည့်ရန်",
    "news.subheading": "သတင်း → စျေးညွှန်",
    "news.hintPaste":
      "အထက်မှ ခေါင်းစဉ်များ ထည့်ပါ၊ ပြီးလျှင် စည်းမျဉ်း ဖော်ပြချက်ကို ဖွင့်ပါ (အကြံပြုချက် မဟုတ်)။",
    "news.placeholder": "စာပိုဒ် ကူးထည့်ပါ…",
    "news.estimate": "လမ်းကြောင်း ခန့်မှန်း",
    "news.resultLabel": "ခန့်မှန်း",
    "news.blendMeta":
      "ပျမ်းမျှ ပေါင်း {avg} · သော့ချက် အသာတကြမ်း {net} · စာပိုဒ် {n} ခု",
    "news.addSentence": "စာကြောင်း တစ်ကြောင်း အနည်းဆုံး ထည့်ပါ။",
    "news.verdictUp": "ဈေးနှုန်း တက်နိုင်သည်",
    "news.verdictDown": "ဈေးနှုန်း ကျနိုင်သည်",
    "news.verdictFlat": "ဈေးနှုန်း တည်ငြိမ်နိုင်သည်",
    "weather.title": "မြန်မာ ရာသီဥတု",
    "weather.hintWeb":
      "Open-Meteo (API သော့ မလို)။ တည်နေရာအတွက် HTTPS သို့ localhost လိုအပ်သည်။",
    "weather.hintMobile":
      "Open-Meteo (API သော့ မလို)။ အင်တာနက်လိုအပ်သည်။ GPS သည် ဤဖုန်းတွင်သာ သုံးသည်။",
    "weather.openMeteo": "Open-Meteo",
    "weather.useLocation": "ကျွန်ုပ် တည်နေရာ သုံးရန်",
    "weather.gettingLocation": "တည်နေရာ ရယူနေသည်…",
    "weather.nearYou": "သင်နီးစပ်",
    "weather.nearestListed": "အနီးဆုံး စာရင်းထဲမြို့",
    "weather.humidity": "စိုထိုင်းဆ",
    "weather.wind": "လေ",
    "weather.allRegions": "တိုင်းဒေသကြီး အားလုံး",
    "weather.refresh": "ပြန်ဖတ်",
    "weather.loadingForecasts": "ခန့်မှန်းချက် ဖတ်နေသည်…",
    "weather.failed": "မအောင်မြင်",
    "weather.alertPermissionTitle": "တည်နေရာ ခွင့်ပြုချက် မရှိပါ",
    "weather.alertPermissionBody":
      "သင်နေရာအတွက် ရာသီဥတု ကြည့်ရန် ဆက်တင်တွင် တည်နေရာ ခွင့်ပြုပါ။",
    "weather.alertErrorTitle": "တည်နေရာ သို့ ရာသီဥတု မှား",
    "weather.alertErrorBody": "GPS သို့မဟုတ် ရာသီဥတု မဖတ်နိုင်ပါ။",
    "errors.geoUnsupported": "ဤဘရောက်ဆာတွင် တည်နေရာ မပံ့ပိုးပါ။",
    "errors.geoDenied": "တည်နေရာ ခွင့်ပြုချက် ငြင်းပယ်ခဲ့သည်။",
    "errors.geoNeedHttps":
      "တည်နေရာအတွက် HTTPS သို့ localhost လိုအပ်သည် (LAN IP ဖြင့် မရပါ)။",
    "errors.locationServicesOff":
      "စက်တွင် တည်နေရာ ဝန်ဆောင်မှု ပိတ်ထားသည်။ ဆက်တင်မှ ဖွင့်ပါ။",
    "errors.locationTimeout":
      "တည်နေရာ ရယူရန် အချိန်ကုန်သွားသည်။ ပြင်ပသို့ ထွက်ပြီး ထပ်စမ်းပါ။",
    "errors.weatherLoad": "ရာသီဥတု မဖတ်နိုင်ပါ။",
    "errors.headlinesLoad": "ခေါင်းစဉ် မဖတ်နိုင်ပါ။",
    "nav.mainAria": "အဓိက လမ်းညွှန်",
    "common.mmk": "ကျပ်",
  },
  en: {
    "tab.home": "Home",
    "tab.market": "Market",
    "tab.weather": "Weather",
    "tab.news": "News",
    "tab.settings": "Settings",
    "home.tag": "Hackathon app — Vite + React and @agriora/core on web & mobile.",
    "home.pill": "Offline-first rules",
    "settings.title": "Settings",
    "settings.languageTitle": "Language",
    "settings.languageMy": "Burmese",
    "settings.languageEn": "English",
    "settings.languageNote":
      "Your choice is saved on this device. Web and phone store separately.",
    "about.title": "About",
    "about.body":
      "Team Agriora — hackathon build. Web uses Vite + React; mobile uses Expo. @agriora/core holds market data from data.xlsx, live RSS headlines, price hints, and Myanmar places for weather. Forecasts from Open-Meteo.",
    "market.title": "Market prices",
    "market.hint":
      "Baseline from data.xlsx ({count} items with prices, generated {generated}). Optional news + weather adjust a simple demo forecast — not advice.",
    "market.searchPlaceholder": "Search (Myanmar or category text)…",
    "market.searchAria": "Search market items",
    "market.itemsAria": "Items",
    "market.selected": "Selected",
    "market.yangonWeather": "Yangon weather",
    "market.myLocation": "My location",
    "market.loading": "Loading…",
    "market.optionalNews": "Optional news (English works best for rules)",
    "market.newsPlaceholder": "Paste headlines or notes…",
    "market.demoForecast": "Demo forecast",
    "market.range": "Range",
    "market.baselineMid": "baseline mid",
    "market.factorTrend": "Trend",
    "market.factorNews": "News",
    "market.factorWeather": "Weather",
    "market.predictionDisclaimer":
      "Illustrative model only — not financial, legal, or agronomic advice.",
    "news.title": "News",
    "news.hint":
      "BBC Burmese and other RSS; Google News for Myanmar and commodities. Needs network; rss2json fallback if a feed blocks the browser (demo only).",
    "news.refresh": "Refresh",
    "news.loadingHeadlines": "Loading…",
    "news.filterAria": "Filter by region",
    "news.filterAll": "All",
    "news.filterMyanmar": "Myanmar / region",
    "news.filterIntl": "International",
    "news.addToHint": "Add to price hint box",
    "news.subheading": "News → price hint",
    "news.hintPaste":
      "Paste or add headlines above, then run the offline rules (not advice).",
    "news.placeholder": "Paste a paragraph…",
    "news.estimate": "Estimate trend",
    "news.resultLabel": "Estimate",
    "news.blendMeta":
      "Blend avg {avg} · keyword net {net} · {n} sentence(s)",
    "news.addSentence": "Add at least a short sentence.",
    "news.verdictUp": "Prices may increase",
    "news.verdictDown": "Prices may decrease",
    "news.verdictFlat": "Prices may stay about the same",
    "weather.title": "Myanmar weather",
    "weather.hintWeb":
      "Data from Open-Meteo (no API key). Use HTTPS or localhost for location.",
    "weather.hintMobile":
      "Data from Open-Meteo (no API key). Needs internet. GPS uses this phone only.",
    "weather.openMeteo": "Open-Meteo",
    "weather.useLocation": "Use my location",
    "weather.gettingLocation": "Getting location…",
    "weather.nearYou": "Near you",
    "weather.nearestListed": "Nearest listed place",
    "weather.humidity": "Humidity",
    "weather.wind": "Wind",
    "weather.allRegions": "All regions",
    "weather.refresh": "Refresh",
    "weather.loadingForecasts": "Loading forecasts…",
    "weather.failed": "Failed",
    "weather.alertPermissionTitle": "Location off",
    "weather.alertPermissionBody":
      "Allow location in Settings to see weather where you are.",
    "weather.alertErrorTitle": "Location error",
    "weather.alertErrorBody": "Could not read GPS or weather.",
    "errors.geoUnsupported": "Geolocation is not supported in this browser.",
    "errors.geoDenied": "Location permission denied.",
    "errors.geoNeedHttps":
      "Location needs HTTPS or localhost (not a plain http:// LAN IP).",
    "errors.locationServicesOff":
      "Location services are turned off on this device. Enable them in Settings.",
    "errors.locationTimeout":
      "Location request timed out. Move outdoors and try again.",
    "errors.weatherLoad": "Could not load weather.",
    "errors.headlinesLoad": "Could not load headlines.",
    "nav.mainAria": "Main",
    "common.mmk": "MMK",
  },
};

export function appT(locale: AppLocale, key: AppStringKey): string {
  return STRINGS[locale][key] ?? STRINGS.en[key] ?? key;
}

/** Replace `{name}` placeholders in a string. */
export function appTFormat(
  locale: AppLocale,
  key: AppStringKey,
  vars: Record<string, string | number>
): string {
  let s = appT(locale, key);
  for (const [k, v] of Object.entries(vars)) {
    s = s.replaceAll(`{${k}}`, String(v));
  }
  return s;
}

export function verdictLabelForLocale(
  locale: AppLocale,
  verdict: "up" | "down" | "flat"
): string {
  if (verdict === "up") return appT(locale, "news.verdictUp");
  if (verdict === "down") return appT(locale, "news.verdictDown");
  return appT(locale, "news.verdictFlat");
}
