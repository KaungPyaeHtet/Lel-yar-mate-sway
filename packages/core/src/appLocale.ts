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
  | "market.mlBackendTitle"
  | "market.mlBackendHint"
  | "market.mlBackendFetch"
  | "market.mlBackendLoading"
  | "market.mlBackendResult"
  | "market.mlBackendNeedHistory"
  | "market.mlBackendNoUrl"
  | "market.chartTitle"
  | "market.riceSeedNote"
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
  | "errors.mlBackend"
  | "nav.mainAria"
  | "common.mmk";

const STRINGS: Record<AppLocale, Record<AppStringKey, string>> = {
  my: {
    "tab.home": "ပင်မ",
    "tab.market": "စပါးစျေး",
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
    "market.title": "စပါးဈေး ဈေးနှုန်းများ",
    "market.hint":
      "စပါး/ဆန် ဈေးနှုန်းသာ ({count} မျိုး)။ ရက်စွဲအလိုက် အလယ်ဈေး ကြည့်ရန် အောက်ပါ ဂရပ်။ အခြေခံ data.xlsx ({generated})။",
    "market.searchPlaceholder": "စပါး အမျိုးအစား ရှာရန်…",
    "market.searchAria": "စပါး ရှာရန်",
    "market.itemsAria": "စပါး စာရင်း",
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
    "market.mlBackendTitle": "Python မော်ဒယ် (နောက်တစ်ရက် %)",
    "market.mlBackendHint":
      "ဒေဗလုပ်ချိန်တွင် ပုံသေ http://127.0.0.1:8000 သုံးသည်။ ဖုန်းမှ ဖွင့်လျှင် ကွန်ပြူတာ LAN IP ဖြင့် apps/web/.env.development ကို ပြင်ပါ။ ဈေး မှတ်တမ်း ၈ ကြိမ် လိုအပ်သည်။",
    "market.mlBackendFetch": "Python API မှ ခန့်မှန်း",
    "market.mlBackendLoading": "ML ဆာဗာ ဆက်သွယ်နေသည်…",
    "market.mlBackendResult": "နောက်တစ်ရက် ဈေးပြောင်းနှုန်း ခန့်မှန်း (%)",
    "market.mlBackendNeedHistory": "ဤပစ္စည်းတွင် ဈေး မှတ်တမ်း ၈ ကြိမ် မလုံလောက်ပါ။",
    "market.mlBackendNoUrl":
      "ML API မတွေ့ပါ။ npm run ml:api ဖွင့်ပြီး ဝဘ်ကို ပြန်စတင်ပါ (သို့ .env မှာ VITE_ML_API_URL ထည့်ပါ)။",
    "market.chartTitle": "ယခင်ဈေးများ (အလယ်ဈေး)",
    "market.riceSeedNote":
      "data.xlsx တွင် စပါးစာကြောင်း မတွေ့သေးပါ — ပြသချက်အတွက် စပါးနမူနာ ဈေးတွဲကို သုံးထားသည်။ စပါးထည့်ပြီး script ပြန်တင်ပါ။",
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
    "errors.mlBackend": "Python ML ဆာဗာ ချိတ်ဆက် မရပါ။",
    "nav.mainAria": "အဓိက လမ်းညွှန်",
    "common.mmk": "ကျပ်",
  },
  en: {
    "tab.home": "Home",
    "tab.market": "Rice",
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
    "market.title": "Rice market prices",
    "market.hint":
      "Rice / paddy items only ({count}). Chart shows midpoint over sheet dates. Source snapshot {generated}.",
    "market.searchPlaceholder": "Search rice types…",
    "market.searchAria": "Search rice items",
    "market.itemsAria": "Rice items",
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
    "market.mlBackendTitle": "Python model (next-day %)",
    "market.mlBackendHint":
      "Dev default is http://127.0.0.1:8000. From a phone, set your PC’s LAN IP in apps/web/.env.development (or EXPO_PUBLIC_ML_API_URL for Expo). Needs 8 price observations.",
    "market.mlBackendFetch": "Fetch from Python API",
    "market.mlBackendLoading": "Calling ML server…",
    "market.mlBackendResult": "Estimated next-day price change (%)",
    "market.mlBackendNeedHistory": "This item needs at least 8 price observations.",
    "market.mlBackendNoUrl":
      "ML API URL unavailable. Run npm run ml:api and restart the web app, or set VITE_ML_API_URL.",
    "market.chartTitle": "Past prices (midpoint)",
    "market.riceSeedNote":
      "No rice rows in data.xlsx yet — showing demo rice series on the same dates. Add rice rows and re-run xlsx_to_market.py.",
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
    "errors.mlBackend": "Could not reach the Python ML server.",
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
