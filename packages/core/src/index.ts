export {
  analyzeBlended,
  analyzeWithRules,
  splitSentences,
  type SentenceScore,
  type Verdict,
} from "./sentiment";

export {
  MYANMAR_PLACES,
  distanceKm,
  findNearestPlace,
  type MyanmarPlace,
} from "./myanmarRegions";

export {
  buildOpenMeteoCurrentUrl,
  fetchCurrentWeather,
  parseOpenMeteoCurrent,
  weatherCodeLabel,
  weatherCodeLabelLocale,
  type CurrentWeatherSnapshot,
} from "./weather";

export {
  DEFAULT_APP_LOCALE,
  LOCALE_STORAGE_KEY,
  appT,
  appTFormat,
  parseStoredLocale,
  verdictLabelForLocale,
  type AppLocale,
  type AppStringKey,
} from "./appLocale";

export {
  NEWS_FEED_SOURCES,
  NEWS_FEED_SOURCE_HOSTNAMES,
  configureNewsRssFetch,
  fetchHeadlinesFromSource,
  loadAggregatedHeadlines,
  parseRssXml,
  type NewsFeedScope,
  type NewsFeedSource,
  type NewsFilter,
  type NewsHeadline,
} from "./newsFeeds";

export {
  getMarketItemById,
  latestMidpoint,
  latestObservation,
  predictItemPrice,
  searchMarketItems,
  weatherPriceModifier,
  MARKET_GENERATED_AT_ISO,
  MARKET_ITEMS,
  MARKET_PERIODS_ISO,
  MARKET_SOURCE_FILE,
  type PricePrediction,
  type MarketItem,
  type PriceObservation,
} from "./market";
