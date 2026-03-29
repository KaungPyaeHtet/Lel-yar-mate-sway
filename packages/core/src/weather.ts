/**
 * Open-Meteo — free, no API key. https://open-meteo.com/
 * Attribution: Weather data by Open-Meteo.com (CC BY 4.0).
 */

const TIMEZONE = "Asia/Yangon";

export type CurrentWeatherSnapshot = {
  temperatureC: number;
  humidityPct: number | null;
  windKmh: number | null;
  weatherCode: number;
  weatherLabel: string;
  time: string;
};

/** WMO Weather interpretation codes (WW) — simplified day labels. */
/**
 * Rough daily rainfall (mm) used with the rice XGBoost model when only the
 * Open-Meteo WMO code is available (current conditions omit precipitation mm).
 */
export function rainfallMmHintFromWeatherCode(code: number): number {
  if (code >= 61 && code <= 67) return 14;
  if (code >= 80 && code <= 82) return 10;
  if (code >= 95 && code <= 99) return 20;
  if (code >= 51 && code <= 57) return 3;
  return 0;
}

export function weatherCodeLabel(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 3) return "Mainly clear / cloudy";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code >= 95 && code <= 99) return "Thunderstorm";
  return "Other";
}

/** Localized condition line for UI (Open-Meteo WMO codes). */
export function weatherCodeLabelLocale(
  code: number,
  locale: "en" | "my"
): string {
  if (locale === "en") return weatherCodeLabel(code);
  if (code === 0) return "တိမ်နည်းပါး — ကောင်းကင် ကင်းလွင်";
  if (code <= 3) return "အများအားဖြင့် ကြည်လင် / တိမ်";
  if (code === 45 || code === 48) return "မြူမှောင်";
  if (code >= 51 && code <= 57) return "သင်းသင်း ရွာသွန်းမှု";
  if (code >= 61 && code <= 67) return "မိုး";
  if (code >= 71 && code <= 77) return "နှင်း";
  if (code >= 80 && code <= 82) return "မိုးဖွဲဖွဲ";
  if (code >= 85 && code <= 86) return "နှင်းဖွဲဖွဲ";
  if (code >= 95 && code <= 99) return "မိုးကြိုး";
  return "အခြား";
}

export function buildOpenMeteoCurrentUrl(latitude: number, longitude: number): string {
  const p = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "weather_code",
      "wind_speed_10m",
    ].join(","),
    timezone: TIMEZONE,
    wind_speed_unit: "kmh",
  });
  return `https://api.open-meteo.com/v1/forecast?${p.toString()}`;
}

type OpenMeteoJson = {
  current?: {
    time?: string;
    temperature_2m?: number;
    relative_humidity_2m?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
};

export function parseOpenMeteoCurrent(json: unknown): CurrentWeatherSnapshot | null {
  const j = json as OpenMeteoJson;
  const c = j?.current;
  if (
    !c ||
    typeof c.temperature_2m !== "number" ||
    typeof c.weather_code !== "number"
  ) {
    return null;
  }
  return {
    temperatureC: c.temperature_2m,
    humidityPct:
      typeof c.relative_humidity_2m === "number"
        ? c.relative_humidity_2m
        : null,
    windKmh: typeof c.wind_speed_10m === "number" ? c.wind_speed_10m : null,
    weatherCode: c.weather_code,
    weatherLabel: weatherCodeLabel(c.weather_code),
    time: typeof c.time === "string" ? c.time : "",
  };
}

export async function fetchCurrentWeather(
  latitude: number,
  longitude: number
): Promise<CurrentWeatherSnapshot> {
  const url = buildOpenMeteoCurrentUrl(latitude, longitude);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Weather request failed (${res.status})`);
  }
  const parsed = parseOpenMeteoCurrent(await res.json());
  if (!parsed) {
    throw new Error("Unexpected weather response");
  }
  return parsed;
}
