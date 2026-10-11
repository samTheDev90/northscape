// Weather service — Open-Meteo. Free, no API key required.
// https://open-meteo.com/

export interface WeatherLocation {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export const WEATHER_LOCATIONS: WeatherLocation[] = [
  { id: "tetulia", name: "Tetulia", lat: 26.5, lon: 88.35 },
  { id: "panchagarh", name: "Panchagarh Town", lat: 26.3333, lon: 88.55 },
  { id: "banglabandha", name: "Banglabandha", lat: 26.6333, lon: 88.4 },
];

export interface CurrentWeather {
  time: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  cloudCover: number;
  weatherCode: number;
}

export interface DailyForecast {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  sunrise: string;
  sunset: string;
  precipitationProbability: number;
  /** Mean cloud cover during the morning viewing window (sunrise → 9 AM). */
  morningCloudCover: number;
  /** Mean cloud cover across the full day. */
  dayCloudCover: number;
}

export interface WeatherData {
  fetchedAt: string;
  location: WeatherLocation;
  current: CurrentWeather;
  daily: DailyForecast[];
}

/**
 * Average cloud cover over an ISO 8601 time range.
 * Returns 0 if there are no samples in the range.
 */
function averageCloudOverRange(
  times: string[],
  cloud: number[],
  fromIso: string,
  toIso: string,
): number {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  let sum = 0;
  let count = 0;
  for (let i = 0; i < times.length; i++) {
    const t = new Date(times[i]).getTime();
    if (t >= from && t <= to && typeof cloud[i] === "number") {
      sum += cloud[i];
      count++;
    }
  }
  return count === 0 ? 0 : Math.round(sum / count);
}

export async function fetchWeather(loc: WeatherLocation): Promise<WeatherData> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(loc.lat));
  url.searchParams.set("longitude", String(loc.lon));
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,cloud_cover",
  );
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max",
  );
  url.searchParams.set("hourly", "cloud_cover");
  url.searchParams.set("timezone", "Asia/Dhaka");
  url.searchParams.set("forecast_days", "7");

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Weather service returned ${res.status}.`);
  }
  const json = await res.json();

  const current: CurrentWeather = {
    time: json.current.time,
    temperature: json.current.temperature_2m,
    apparentTemperature: json.current.apparent_temperature,
    humidity: json.current.relative_humidity_2m,
    windSpeed: json.current.wind_speed_10m,
    cloudCover: json.current.cloud_cover,
    weatherCode: json.current.weather_code,
  };

  const hourlyTimes: string[] = json.hourly?.time ?? [];
  const hourlyCloud: number[] = json.hourly?.cloud_cover ?? [];

  const daily: DailyForecast[] = json.daily.time.map(
    (date: string, i: number) => {
      const sunrise = json.daily.sunrise[i];
      const sunset = json.daily.sunset[i];

      // Morning viewing window: sunrise → 9 AM same day.
      const morningEnd = new Date(sunrise);
      morningEnd.setHours(9, 0, 0, 0);
      const morningCloudCover = averageCloudOverRange(
        hourlyTimes,
        hourlyCloud,
        sunrise,
        morningEnd.toISOString(),
      );

      // Whole-day average: sunrise → sunset.
      const dayCloudCover = averageCloudOverRange(
        hourlyTimes,
        hourlyCloud,
        sunrise,
        sunset,
      );

      return {
        date,
        weatherCode: json.daily.weather_code[i],
        tempMax: json.daily.temperature_2m_max[i],
        tempMin: json.daily.temperature_2m_min[i],
        sunrise,
        sunset,
        precipitationProbability:
          json.daily.precipitation_probability_max[i] ?? 0,
        morningCloudCover,
        dayCloudCover,
      };
    },
  );

  return {
    fetchedAt: new Date().toISOString(),
    location: loc,
    current,
    daily,
  };
}

export function weatherLabel(code: number): string {
  if (code === 0) return "Clear sky";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code >= 95 && code <= 99) return "Thunderstorm";
  return "Unknown";
}

export function weatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code === 1) return "🌤️";
  if (code === 2) return "⛅";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 51 && code <= 57) return "🌦️";
  if (code >= 61 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "❄️";
  if (code >= 80 && code <= 82) return "🌦️";
  if (code >= 85 && code <= 86) return "🌨️";
  if (code >= 95) return "⛈️";
  return "🌥️";
}

/**
 * Kanchanjanga visibility outlook.
 * Morning cloud cover is the primary signal — precipitation is secondary.
 */
export function kanchanjangaOutlook(d: DailyForecast): {
  score: number;
  label: string;
  colorClass: string;
  barClass: string;
} {
  const score = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        100 - d.morningCloudCover * 0.75 - d.precipitationProbability * 0.25,
      ),
    ),
  );
  if (score >= 80)
    return {
      score,
      label: "Excellent",
      colorClass: "text-forest",
      barClass: "bg-forest",
    };
  if (score >= 60)
    return {
      score,
      label: "Good",
      colorClass: "text-peach",
      barClass: "bg-peach",
    };
  if (score >= 40)
    return {
      score,
      label: "Fair",
      colorClass: "text-gold",
      barClass: "bg-gold",
    };
  if (score >= 20)
    return {
      score,
      label: "Poor",
      colorClass: "text-coral",
      barClass: "bg-coral",
    };
  return {
    score,
    label: "Very poor",
    colorClass: "text-coral",
    barClass: "bg-coral",
  };
}

export function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function formatDay(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { weekday: "short" });
  } catch {
    return iso;
  }
}

export function formatDayDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return iso;
  }
}
