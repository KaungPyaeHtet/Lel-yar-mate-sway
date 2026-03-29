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
  | "market.mlBackendTitle"
  | "market.mlBackendHint"
  | "market.mlBackendFetch"
  | "market.mlBackendLoading"
  | "market.mlBackendResult"
  | "market.mlBackendNeedHistory"
  | "market.mlBackendNoUrl"
  | "market.chartTitle"
  | "market.riceSeedNote"
  | "market.autoHint"
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
  | "market.adviceDisclaimer"
  | "market.adviceDetailsToggle"
  | "market.adviceDetailsModelMove"
  | "market.adviceDetailsSignal"
  | "market.adviceDetailsSignalNote"
  | "market.adviceDetailsSentiment"
  | "market.adviceDetailsSentimentHint"
  | "market.adviceDetailsNewsLabel"
  | "market.adviceDetailsWeather"
  | "market.adviceDetailsPattern"
  | "market.adviceDetailsScreenRule"
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
    "tab.market": "စပါးစျေး",
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
    "market.title": "စပါးဈေး ဈေးနှုန်းများ",
    "market.hint":
      "မှီငြမ်း စပါးဈေး တစ်မျိုးသာ။ အလယ်ဈေး မှတ်တမ်း ({generated})။",
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
    "market.autoHint":
      "သတင်းနှင့် ရာသီဥတုကို မျက်နှာပြင်တွင် မပြဘဲ နောက်ခံတွင် သုံးပါသည် — ခန့်မှန်းချက် နှင့် ML မော်ဒယ်အတွက်။",
    "market.pythonAutoNote":
      "သတင်း/ရာသီဥတု နောက်ခံမှ ထည့်သွင်းပြီး နောက်တစ်ရက် ဈေးပြောင်းနှုန်း (%) ကို ML ဆာဗာသို့ အလိုအလျောက် တောင်းပါသည်။",
    "market.forecastPriceTitle": "ခန့်မှန်း ဈေးနှုန်း",
    "market.weatherFallback":
      "တည်နေရာ မရရှိပါ — ရန်ကုန် ရာသီဥတု သုံးထားသည်",
    "market.adviceTitle": "နောက်တစ်ရက် လမ်းညွှန်",
    "market.adviceHold": "ထားပါ (Hold)",
    "market.adviceHoldSub": "မော်ဒယ်အရ ဈေး တက်နိုင်သည် — အရောင်းပိုင်း နှောင့်နှေးပါ။",
    "market.adviceSell": "ရောင်းရှားပါ",
    "market.adviceSellSub": "ဈေး ကျနိုင်သည် — ရောင်းချဖို့ စဉ်းစားပါ။",
    "market.adviceNeutral": "စောင့်ကြည့်ပါ",
    "market.adviceNeutralSub": "တက်ကျ ပြင်းထန်မှု မထင်ရှားပါ — ဆက်လက် စောင့်ကြည့်ပါ။",
    "market.adviceDisclaimer":
      "မော်ဒယ် အကြံပြုချက်သာ — ငွေရေးကြေးရေး အကြံဉာဏ် မဟုတ်ပါ။",
    "market.adviceDetailsToggle": "ဘာကြောင့် ဒီလမ်းညွှန်လဲ (အသေးစိတ်)",
    "market.adviceDetailsModelMove":
      "XGBoost မော်ဒယ် ခန့်မှန်း နောက်တစ်ရက် ပြောင်းနှုန်း — {pct}",
    "market.adviceDetailsSignal":
      "အချက်ပြင်းအား (ပြည်စုံနိုင်ခြေ မဟုတ်ပါ) — လွန်ခဲ့သော ~{pct}%",
    "market.adviceDetailsSignalNote":
      "နောက်တစ်ရက် ဈေးကို အာမခံမရပါ။ အချက်ပြင်းအားသည် ခန့်မှန်းချက် အရွယ်အစားနှင့် သတင်း feature ကို အကြမ်းဖွဲ့ပေါင်းစပ်ထားသည်။",
    "market.adviceDetailsSentiment":
      "သတင်း sentiment feature (ClimateBERT မျဉ်းကြောင်း) — {score}",
    "market.adviceDetailsSentimentHint":
      "ဒီအမှတ်သည် မော်ဒယ်ထဲ သုံးသော ခေါင်းစဉ်များပေါ် မူတည်သည်။ အပေါ်/အောက် ဈေးလမ်းကြောင်းနှင့် ပေါင်းစပ်ပါသည်။",
    "market.adviceDetailsNewsLabel":
      "မော်ဒယ်သို့ ပို့ထားသော ခေါင်းစဉ်များ (နောက်ခံ သတင်း)",
    "market.adviceDetailsWeather":
      "ရာသီဥတု input — {temp}°C · {condition} · မိုးရေ {rain} mm",
    "market.adviceDetailsPattern":
      "မှတ်တမ်း အလယ်ဈေး — ယမန်နေ့နှင့် နှိုင်းစာရင် {d1}။ ၇ ကြိမ်အကြာကနှင့် {d7}။",
    "market.adviceDetailsScreenRule":
      "မျက်နှာပြင် ခန့်မှန်း (စည်းမျဉ်းမူဝါဒ သတင်းဖတ်) — {verdict}",
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
    "tab.market": "Rice",
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
    "market.title": "Rice market prices",
    "market.hint":
      "Single reference rice series. Mid-price history ({generated}).",
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
    "market.autoHint":
      "Headlines and weather are not shown here — they load in the background for the price estimate and ML model.",
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
      "The model suggests prices may fall — selling soon may be safer.",
    "market.adviceNeutral": "Wait and watch",
    "market.adviceNeutralSub":
      "No strong move expected — keep monitoring the market.",
    "market.adviceDisclaimer":
      "Model guidance only — not financial advice.",
    "market.adviceDetailsToggle": "Why this recommendation? (details)",
    "market.adviceDetailsModelMove":
      "XGBoost next-day move estimate — {pct}",
    "market.adviceDetailsSignal":
      "Signal strength (not a true probability) — about {pct}%",
    "market.adviceDetailsSignalNote":
      "The model cannot guarantee tomorrow’s price. Strength blends how large the predicted move is with how strong the news feature is.",
    "market.adviceDetailsSentiment":
      "News sentiment feature (ClimateBERT-style) — {score}",
    "market.adviceDetailsSentimentHint":
      "This score comes from the same headlines fed to the model and is mixed with price patterns.",
    "market.adviceDetailsNewsLabel": "Headlines sent to the model (background feed)",
    "market.adviceDetailsWeather":
      "Weather inputs — {temp}°C · {condition} · rainfall {rain} mm",
    "market.adviceDetailsPattern":
      "Recorded mid prices — vs previous day: {d1}; vs 7 observations back: {d7}.",
    "market.adviceDetailsScreenRule":
      "On-screen price estimate (rule-based news read) — {verdict}",
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
