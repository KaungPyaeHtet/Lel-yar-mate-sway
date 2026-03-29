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
  | "market.searchPlaceholder"
  | "market.searchAria"
  | "market.itemsAria"
  | "market.selected"
  | "market.chooseItem"
  | "market.itemFilterPlaceholder"
  | "market.itemListHint"
  | "market.itemListCap"
  | "market.forecastConfidenceMl"
  | "market.forecastConfidenceLoading"
  | "market.forecastConfidenceNoMl"
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
  | "market.mlBackendTitle"
  | "market.mlBackendHint"
  | "market.mlBackendFetch"
  | "market.mlBackendLoading"
  | "market.mlBackendResult"
  | "market.mlBackendNeedHistory"
  | "market.mlBackendNoUrl"
  | "market.chartTitle"
  | "market.chartDataThrough"
  | "market.pythonAutoNote"
  | "market.forecastPriceTitle"
  | "market.weatherFallback"
  | "market.adviceTitle"
  | "market.adviceHold"
  | "market.adviceHoldSub"
  | "market.adviceSell"
  | "market.adviceSellSub"
  | "market.adviceNeutral"
  | "market.adviceNeutralSub"
  | "market.adviceDetailsToggle"
  | "market.adviceWhySummary"
  | "market.adviceStrengthSoft"
  | "market.adviceStrengthMid"
  | "market.adviceStrengthFirm"
  | "market.adviceWhyHeadlines"
  | "market.adviceWhyHeadlinesMore"
  | "market.adviceWhyWeather"
  | "market.adviceWhyTrend"
  | "market.adviceWhySimpleRead"
  | "market.adviceDetailsPlaceholderNews"
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
  | "errors.mlBackend"
  | "nav.mainAria"
  | "common.mmk";

const STRINGS: Record<AppLocale, Record<AppStringKey, string>> = {
  my: {
    "tab.home": "ပင်မ",
    "tab.market": "စျေးဈေး",
    "tab.weather": "ရာသီဥတု",
    "tab.news": "သတင်း",
    "tab.settings": "ချိန်ညှိမှု",
    "home.tag": "ဈေးလမ်းကြောင်း ကြိုသိဖို့ — သတင်းမလိုပါဘူး။",
    "home.pill": "",
    "settings.title": "ချိန်ညှိမှု",
    "settings.languageTitle": "ဘာသာစကား",
    "settings.languageMy": "မြန်မာ",
    "settings.languageEn": "အင်္ဂလိပ်",
    "about.title": "အကြောင်း",
    "about.body":
      "ကျွန်ုပ်တို့သည် မြန်မာ စိုက်ပျိုးရှင်များ အတွက် Agriora အဖွဲ့ဖြစ်ပါသည်။\n\nစိုက်ပျိုးရှင်အများစုမှာ နေ့စဉ် စျေးကွက် သတင်းများ သို့မဟုတ် ကမ္ဘာ့ကုန်ဈေး သတင်းများကို မဖတ်ဖြစ်ကြပါ။ သို့သော် ထိုသတင်းများက ဈေးနှုန်း တက်ခြင်း သို့ ကျခြင်းနှင့် ဆက်နွယ်နေတတ်ပါသည်။\n\nAgriora သည် သတင်းများကို စုစည်းကာ ခန့်မှန်းချက်နှင့် ပေါင်းစပ်၍ ဈေးလမ်းကြောင်း ပြသပေးပါသည်။ သတင်းမဖတ်ဖြစ်သော်လည်း ဈေးအပြောင်းအလဲကို ကြိုတင်သိရှိပြီး ရောင်းဝယ်ချိန်ကို ပိုကောင်းအောင် စီစဉ်နိုင်စေရန်၊ စိုက်ပျိုးသူများ အကျိုးအမြတ် ရရှိရေး ကူညီပေးရန် ရည်ရွယ်ပါသည်။",
    "market.title": "စိုက်ပျိုးကုန်စည် ဈေးနှုန်းများ",
    "market.searchPlaceholder": "ပစ္စည်း ရှာရန်…",
    "market.searchAria": "ပစ္စည်း ရှာရန်",
    "market.itemsAria": "ပစ္စည်းစာရင်း",
    "market.selected": "ရွေးထားသည်",
    "market.chooseItem": "ပစ္စည်း ရွေးပါ (data.xlsx)",
    "market.itemFilterPlaceholder": "အမည် ရှာရန်…",
    "market.itemListHint": "ဖော်ပြထား {shown} / စုစုပေါင်း {total}",
    "market.itemListCap":
      "စာရင်း ၁၂၀ ထိသာ ပြပါသည် — ပိုရှာရန် အမည် ရိုက်ရှာပါ။",
    "market.forecastConfidenceMl":
      "မော်ဒယ် ယုံကြည်မှု — ခန့် {pct}% (အကြမ်း ညွှန်ပြချက်သာ)။",
    "market.forecastConfidenceLoading": "မော်ဒယ် ယုံကြည်မှု တွက်နေသည်…",
    "market.forecastConfidenceNoMl":
      "ML မော်ဒယ် မရသေးပါ — သတင်း/ရာသီဥတု စည်းမျဉ်း ခန့်မှန်းသာ။",
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
    "market.mlBackendTitle": "Python မော်ဒယ် (နောက်တစ်ရက် %)",
    "market.mlBackendHint":
      "ဒေဗလုပ်ချိန်တွင် ပုံသေ http://127.0.0.1:8000 သုံးသည်။ ဖုန်းမှ ဖွင့်လျှင် ကွန်ပြူတာ LAN IP ဖြင့် apps/web/.env.development ကို ပြင်ပါ။ ဈေး မှတ်တမ်း ၈ ကြိမ် လိုအပ်သည်။",
    "market.mlBackendFetch": "Python API မှ ခန့်မှန်း",
    "market.mlBackendLoading": "ML ဆာဗာ ဆက်သွယ်နေသည်…",
    "market.mlBackendResult": "နောက်တစ်ရက် ဈေးပြောင်းနှုန်း ခန့်မှန်း (%)",
    "market.mlBackendNeedHistory":
      "ဤအတန်းတွင် ဈေးနှုန်း မှတ်တမ်း မတွေ့ပါ (data.xlsx စစ်ပါ)။",
    "market.mlBackendNoUrl":
      "ML API မတွေ့ပါ။ npm run ml:api ဖွင့်ပြီး ဝဘ်ကို ပြန်စတင်ပါ (သို့ .env မှာ VITE_ML_API_URL ထည့်ပါ)။",
    "market.chartTitle": "ယခင်ဈေးများ (အလယ်ဈေး)",
    "market.chartDataThrough":
      "ပြထားသော အလယ်ဈေးများ — နောက်ဆုံး မှတ်တမ်း နေ့ရက် {date}",
    "market.pythonAutoNote":
      "သတင်း/ရာသီဥတု နောက်ခံမှ ထည့်သွင်းပြီး နောက်တစ်ရက် ဈေးပြောင်းနှုန်း (%) ကို ML ဆာဗာသို့ အလိုအလျောက် တောင်းပါသည်။",
    "market.forecastPriceTitle": "ခန့်မှန်း ဈေးနှုန်း",
    "market.weatherFallback":
      "တည်နေရာ မရရှိပါ — ရန်ကုန် ရာသီဥတု သုံးထားသည်",
    "market.adviceTitle": "နောက်တစ်ရက် လမ်းညွှန်",
    "market.adviceHold": "ထားပါ (Hold)",
    "market.adviceHoldSub": "မော်ဒယ်အရ ဈေး တက်နိုင်သည် — အရောင်းပိုင်း နှောင့်နှေးပါ။",
    "market.adviceSell": "ရောင်းရှားပါ",
    "market.adviceSellSub":
      "ဈေး ကျနိုင်သည် သို့ ပတ်လည်ဈေး အားနည်းနေပါက — ဆုံးရှုံးမှု မများအောင် ရောင်းချဖို့ စဉ်းစားပါ။",
    "market.adviceNeutral": "စောင့်ကြည့်ပါ",
    "market.adviceNeutralSub": "တက်ကျ ပြင်းထန်မှု မထင်ရှားပါ — ဆက်လက် စောင့်ကြည့်ပါ။",
    "market.adviceDetailsToggle": "အကြမ်း အကြောင်း",
    "market.adviceWhySummary":
      "「{item}」 အတွက် နောက်ရက်ခန့် ဈေး {pct} လောလားဖော်ပြချက်။ ဤအကြံ့ပြင်းမှု — {strength}။",
    "market.adviceStrengthSoft": "ပြင်းမထန်",
    "market.adviceStrengthMid": "အလယ်",
    "market.adviceStrengthFirm": "ပြင်းထန်",
    "market.adviceWhyHeadlines": "ဖတ်ထားသော သတင်းခေါင်းစဉ်အချို့",
    "market.adviceWhyHeadlinesMore": "…နှင့် ခေါင်းစဉ် {n} ခု အခြား",
    "market.adviceWhyWeather": "ယခု ရာသီဥတု — {temp}°C · {condition}",
    "market.adviceWhyTrend":
      "ယမနေ့နဲ့ နှိုင်းရင် ဈေး {d1}။ မကြာသေးမီကနဲ့ {d7}။",
    "market.adviceWhySimpleRead":
      "ဒီအက်ပ်၏ ခန့်မှန်း သတင်းဖတ် — {verdict}",
    "market.adviceDetailsPlaceholderNews":
      "တိုက်ရိုက် သတင်းခေါင်းစဉ် မရသေးပါ — ပုံမှန် စာကြောင်း သုံးထားသည်။",
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
    "errors.mlBackend": "Python ML ဆာဗာ ချိတ်ဆက် မရပါ။",
    "nav.mainAria": "အဓိက လမ်းညွှန်",
    "common.mmk": "ကျပ်",
  },
  en: {
    "tab.home": "Home",
    "tab.market": "Market",
    "tab.weather": "Weather",
    "tab.news": "News",
    "tab.settings": "Settings",
    "home.tag": "Ahead of the market—without reading the news.",
    "home.pill": "",
    "settings.title": "Settings",
    "settings.languageTitle": "Language",
    "settings.languageMy": "Burmese",
    "settings.languageEn": "English",
    "about.title": "About",
    "about.body":
      "We are Team Agriora — a team building for Myanmar’s farmers.\n\nMany growers do not read market and commodity news every day. Those stories still carry signals about whether prices may rise or fall.\n\nAgriora gathers relevant headlines, combines them with price trends and weather, and shows a simple forecast direction. Our goal is to help farmers plan buying and selling even when they miss the news — so they can spot opportunities and improve returns.",
    "market.title": "Ag wholesale prices",
    "market.searchPlaceholder": "Filter items…",
    "market.searchAria": "Filter market items",
    "market.itemsAria": "Commodity list",
    "market.selected": "Selected",
    "market.chooseItem": "Choose item (from data.xlsx)",
    "market.itemFilterPlaceholder": "Filter by name…",
    "market.itemListHint": "Showing {shown} of {total}",
    "market.itemListCap":
      "Only the first 120 rows are listed — type to filter the full sheet.",
    "market.forecastConfidenceMl":
      "Model confidence: about {pct}% (rough signal only).",
    "market.forecastConfidenceLoading": "Estimating model confidence…",
    "market.forecastConfidenceNoMl":
      "ML model unavailable — showing a rule-based estimate only.",
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
    "market.mlBackendTitle": "Python model (next-day %)",
    "market.mlBackendHint":
      "Dev default is http://127.0.0.1:8000. From a phone, set your PC’s LAN IP in apps/web/.env.development (or EXPO_PUBLIC_ML_API_URL for Expo). Needs 8 price observations.",
    "market.mlBackendFetch": "Fetch from Python API",
    "market.mlBackendLoading": "Calling ML server…",
    "market.mlBackendResult": "Estimated next-day price change (%)",
    "market.mlBackendNeedHistory":
      "No usable price cells for this row (check data.xlsx).",
    "market.mlBackendNoUrl":
      "ML API URL unavailable. Run npm run ml:api and restart the web app, or set VITE_ML_API_URL.",
    "market.chartTitle": "Past prices (midpoint)",
    "market.chartDataThrough":
      "Mid prices shown — last record date: {date}",
    "market.pythonAutoNote":
      "Background news and weather are included when requesting the next-day change (%) from the ML server.",
    "market.forecastPriceTitle": "Estimated price",
    "market.weatherFallback":
      "Location unavailable — using Yangon weather",
    "market.adviceTitle": "Next-day guide",
    "market.adviceHold": "Hold",
    "market.adviceHoldSub":
      "The model suggests prices may rise — waiting to sell could pay off.",
    "market.adviceSell": "Consider selling",
    "market.adviceSellSub":
      "The outlook suggests weaker prices or a down week — selling may limit further losses (not financial advice).",
    "market.adviceNeutral": "Wait and watch",
    "market.adviceNeutralSub":
      "No strong move expected — keep monitoring the market.",
    "market.adviceDetailsToggle": "Why we suggest this",
    "market.adviceWhySummary":
      "For “{item}”: roughly {pct} next-day move. Strength of this hint: {strength}.",
    "market.adviceStrengthSoft": "Weak",
    "market.adviceStrengthMid": "Medium",
    "market.adviceStrengthFirm": "Strong",
    "market.adviceWhyHeadlines": "Some news titles we looked at",
    "market.adviceWhyHeadlinesMore": "…and {n} more titles",
    "market.adviceWhyWeather": "Weather now — {temp}°C · {condition}",
    "market.adviceWhyTrend":
      "Vs yesterday’s mid: {d1}. Vs a week back on the chart: {d7}.",
    "market.adviceWhySimpleRead":
      "This app’s simple news read says: {verdict}",
    "market.adviceDetailsPlaceholderNews":
      "Live headlines were not available — a default text line was used.",
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
