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
  | "news.verdictUp"
  | "news.verdictDown"
  | "news.verdictFlat"
  | "weather.title"
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
    "home.tag":
      "သတင်းမဖတ်ဖြစ်သော စိုက်ပျိုးရှင်များအတွက် သတင်းနှင့် ဈေးလမ်းကြောင်း ခန့်မှန်းချက်။",
    "home.pill": "",
    "settings.title": "ချိန်ညှိမှု",
    "settings.languageTitle": "ဘာသာစကား",
    "settings.languageMy": "မြန်မာ",
    "settings.languageEn": "အင်္ဂလိပ်",
    "about.title": "အကြောင်း",
    "about.body":
      "ကျွန်ုပ်တို့သည် မြန်မာ စိုက်ပျိုးရှင်များ အတွက် Agriora အဖွဲ့ဖြစ်ပါသည်။\n\nစိုက်ပျိုးရှင်အများစုမှာ နေ့စဉ် စျေးကွက် သတင်းများ သို့မဟုတ် ကမ္ဘာ့ကုန်ဈေး သတင်းများကို မဖတ်ဖြစ်ကြပါ။ သို့သော် ထိုသတင်းများက ဈေးနှုန်း တက်ခြင်း သို့ ကျခြင်းနှင့် ဆက်နွယ်နေတတ်ပါသည်။\n\nAgriora သည် သတင်းများကို စုစည်းကာ ခန့်မှန်းချက်နှင့် ပေါင်းစပ်၍ ဈေးလမ်းကြောင်း ပြသပေးပါသည်။ သတင်းမဖတ်ဖြစ်သော်လည်း ဈေးအပြောင်းအလဲကို ကြိုတင်သိရှိပြီး ရောင်းဝယ်ချိန်ကို ပိုကောင်းအောင် စီစဉ်နိုင်စေရန်၊ စိုက်ပျိုးသူများ အကျိုးအမြတ် ရရှိရေး ကူညီပေးရန် ရည်ရွယ်ပါသည်။",
    "market.title": "စျေးကွက် ဈေးနှုန်းများ",
    "market.hint": "",
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
      "စျေးကွက်နှင့် စိုက်ပျိုးရေးသတင်း ခေါင်းစဉ်များ။ အင်တာနက်ချိတ်ဆက်မှု လိုအပ်သည်။ ပြန်ဖတ်ခြင်းဖြင့် အသစ်ဆွဲယူပါ။",
    "news.refresh": "ပြန်ဖတ်",
    "news.loadingHeadlines": "ဖတ်နေသည်…",
    "news.filterAria": "ဒေသ စစ်ထုတ်ရန်",
    "news.filterAll": "အားလုံး",
    "news.filterMyanmar": "မြန်မာ / ဒေသ",
    "news.filterIntl": "နိုင်ငံတကာ",
    "news.verdictUp": "ဈေးနှုန်း တက်နိုင်သည်",
    "news.verdictDown": "ဈေးနှုန်း ကျနိုင်သည်",
    "news.verdictFlat": "ဈေးနှုန်း တည်ငြိမ်နိုင်သည်",
    "weather.title": "မြန်မာ ရာသီဥတု",
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
    "home.tag":
      "News and forecasts for growers — clearer prices even when you miss the headlines.",
    "home.pill": "Offline-first rules",
    "settings.title": "Settings",
    "settings.languageTitle": "Language",
    "settings.languageMy": "Burmese",
    "settings.languageEn": "English",
    "about.title": "About",
    "about.body":
      "We are Team Agriora — a team building for Myanmar’s farmers.\n\nMany growers do not read market and commodity news every day. Those stories still carry signals about whether prices may rise or fall.\n\nAgriora gathers relevant headlines, combines them with price trends and weather, and shows a simple forecast direction. Our goal is to help farmers plan buying and selling even when they miss the news — so they can spot opportunities and improve returns.",
    "market.title": "Market prices",
    "market.hint": "",
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
      "Market and farming headlines from the internet. Refresh to load the latest.",
    "news.refresh": "Refresh",
    "news.loadingHeadlines": "Loading…",
    "news.filterAria": "Filter by region",
    "news.filterAll": "All",
    "news.filterMyanmar": "Myanmar / region",
    "news.filterIntl": "International",
    "news.verdictUp": "Prices may increase",
    "news.verdictDown": "Prices may decrease",
    "news.verdictFlat": "Prices may stay about the same",
    "weather.title": "Myanmar weather",
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
