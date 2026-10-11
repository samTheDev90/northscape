import { useEffect, useState } from "react";
import {
  CloudSun,
  Sunrise,
  Sunset,
  Droplets,
  Wind,
  Cloud,
  RefreshCw,
  AlertTriangle,
  Eye,
  WifiOff,
  Sparkles,
} from "lucide-react";
import { useStore } from "../lib/store";
import {
  WEATHER_LOCATIONS,
  fetchWeather,
  formatDay,
  formatDayDate,
  formatTime,
  kanchanjangaOutlook,
  weatherEmoji,
  weatherLabel,
  type WeatherData,
  type WeatherLocation,
} from "../lib/weather";
import Button from "../components/PrimaryButton";
import Reveal from "../components/Reveal";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: WeatherData }
  | { status: "error"; message: string };

export default function WeatherPage() {
  const { data } = useStore();
  const trip = data.trip;

  const [location, setLocation] = useState<WeatherLocation>(
    WEATHER_LOCATIONS[0],
  );
  const [state, setState] = useState<State>({ status: "idle" });

  const load = async (loc: WeatherLocation) => {
    setState({ status: "loading" });
    try {
      const d = await fetchWeather(loc);
      setState({ status: "ready", data: d });
    } catch (err) {
      setState({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Weather service unreachable. Check your connection.",
      });
    }
  };

  useEffect(() => {
    load(location);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6 pv-fade-up">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl text-textPrimary mb-1">
            Weather & Kanchanjanga
          </h1>
          <p className="text-textSecondary text-sm">
            {trip.startDate
              ? `Forecast for the week ahead — trip starts ${trip.startDate}`
              : "Forecast and mountain-viewing outlook for our destinations."}
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => load(location)}
          disabled={state.status === "loading"}
        >
          <RefreshCw
            className={`w-4 h-4 ${
              state.status === "loading" ? "animate-spin" : ""
            }`}
          />
          Refresh
        </Button>
      </div>

      {/* Location selector */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {WEATHER_LOCATIONS.map((loc) => (
          <button
            key={loc.id}
            onClick={() => setLocation(loc)}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
              location.id === loc.id
                ? "bg-peach text-midnight font-medium"
                : "bg-indigoDeep border border-purpleDark/60 text-textSecondary hover:text-textPrimary"
            }`}
          >
            {loc.name}
          </button>
        ))}
      </div>

      {state.status === "loading" && <LoadingState />}
      {state.status === "error" && (
        <ErrorState message={state.message} onRetry={() => load(location)} />
      )}
      {state.status === "ready" && <ReadyState data={state.data} />}

      {/* Winter tips — always visible, independent of API */}
      <WinterTips />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-6">
        <div className="pv-skeleton h-6 w-40 mb-4" />
        <div className="pv-skeleton h-16 w-48 mb-3" />
        <div className="pv-skeleton h-4 w-32" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-4"
          >
            <div className="pv-skeleton h-3 w-16 mb-3" />
            <div className="pv-skeleton h-8 w-20 mb-2" />
            <div className="pv-skeleton h-3 w-14" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-6">
        <div className="pv-skeleton h-5 w-48 mb-4" />
        <div className="pv-skeleton h-32 w-full" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl border border-coral/40 bg-coral/5 p-6 mb-6">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-full bg-coral/15 border border-coral/40 flex items-center justify-center text-coral shrink-0">
          <WifiOff className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h2 className="font-serif text-lg text-textPrimary mb-1">
            Weather unavailable
          </h2>
          <p className="text-sm text-textSecondary mb-4">{message}</p>
          <p className="text-xs text-lavenderMist mb-4">
            The weather section requires an internet connection. Everything else
            in the app works offline.
          </p>
          <Button onClick={onRetry}>
            <RefreshCw className="w-4 h-4" /> Try again
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ready state
// ---------------------------------------------------------------------------

function ReadyState({ data }: { data: WeatherData }) {
  const current = data.current;
  const today = data.daily[0];
  const tomorrow = data.daily[1];

  return (
    <div className="space-y-6">
      {/* CURRENT + TODAY */}
      <Reveal>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Current conditions */}
          <div className="lg:col-span-2 rounded-2xl border border-purpleDark/60 bg-gradient-to-br from-indigoDeep via-indigoDeep to-purpleDark/30 p-6 pv-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-textSecondary">
                  {data.location.name} · Right now
                </p>
                <p className="text-xs text-lavenderMist mt-0.5">
                  {weatherLabel(current.weatherCode)}
                </p>
              </div>
              <CloudSun className="w-5 h-5 text-peach" />
            </div>

            <div className="flex items-end gap-4 mb-5">
              <span className="text-6xl md:text-7xl leading-none">
                {weatherEmoji(current.weatherCode)}
              </span>
              <span className="font-serif text-5xl md:text-6xl text-textPrimary leading-none">
                {Math.round(current.temperature)}°
              </span>
              <span className="text-sm text-textSecondary pb-2">
                feels like {Math.round(current.apparentTemperature)}°C
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-5 border-t border-purpleDark/40">
              <MiniStat
                icon={Droplets}
                label="Humidity"
                value={`${current.humidity}%`}
              />
              <MiniStat
                icon={Wind}
                label="Wind"
                value={`${Math.round(current.windSpeed)} km/h`}
              />
              <MiniStat
                icon={Cloud}
                label="Cloud"
                value={`${current.cloudCover}%`}
              />
            </div>
          </div>

          {/* Sun times */}
          <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-6 pv-card">
            <h3 className="font-serif text-lg text-textPrimary mb-4">
              Sunrise & Sunset
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gold/15 border border-gold/30 flex items-center justify-center">
                  <Sunrise className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="text-[11px] text-textSecondary uppercase tracking-wider">
                    Sunrise
                  </p>
                  <p className="text-lg text-textPrimary font-medium">
                    {formatTime(today.sunrise)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-coral/15 border border-coral/30 flex items-center justify-center">
                  <Sunset className="w-5 h-5 text-coral" />
                </div>
                <div>
                  <p className="text-[11px] text-textSecondary uppercase tracking-wider">
                    Sunset
                  </p>
                  <p className="text-lg text-textPrimary font-medium">
                    {formatTime(today.sunset)}
                  </p>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-lavenderMist mt-5">
              Best chance to see Kanchanjanga is between sunrise and 9 AM.
            </p>
          </div>
        </div>
      </Reveal>

      {/* KANCHANJANGA OUTLOOK */}
      <Reveal delay={0.05}>
        <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="w-4 h-4 text-peach" />
            <h2 className="font-serif text-lg text-textPrimary">
              Kanchanjanga visibility outlook
            </h2>
          </div>

          <p className="text-xs text-textSecondary mb-5 leading-relaxed">
            Based on forecast cloud cover and precipitation. Actual visibility
            depends on atmospheric haze, fog, and conditions on the day.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <OutlookCard label="Today" forecast={today} />
            <OutlookCard label="Tomorrow" forecast={tomorrow} />
          </div>
        </div>
      </Reveal>

      {/* 7-DAY FORECAST */}
      <Reveal delay={0.1}>
        <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-6">
          <h2 className="font-serif text-lg text-textPrimary mb-5">
            7-day forecast
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {data.daily.map((d, i) => {
              const outlook = kanchanjangaOutlook(d);
              return (
                <div
                  key={d.date}
                  className="shrink-0 w-32 rounded-xl border border-purpleDark/60 bg-midnight/40 p-4 text-center hover:border-peach/40 transition-colors"
                >
                  <p className="text-[11px] uppercase tracking-wider text-textSecondary">
                    {i === 0 ? "Today" : formatDay(d.date)}
                  </p>
                  <p className="text-[10px] text-lavenderMist mb-2">
                    {formatDayDate(d.date)}
                  </p>
                  <div className="text-3xl mb-2">
                    {weatherEmoji(d.weatherCode)}
                  </div>
                  <p className="text-sm text-textPrimary font-medium mb-0.5">
                    {Math.round(d.tempMax)}°
                  </p>
                  <p className="text-xs text-textSecondary mb-3">
                    {Math.round(d.tempMin)}°
                  </p>
                  <div className="pt-3 border-t border-purpleDark/40">
                    <p className="text-[9px] uppercase tracking-wider text-textSecondary mb-1">
                      K-View
                    </p>
                    <p className={`text-xs font-medium ${outlook.colorClass}`}>
                      {outlook.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Reveal>

      {/* DISCLOSURE */}
      <p className="text-[11px] text-lavenderMist text-center">
        Weather source:{" "}
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noreferrer"
          className="text-peach/80 hover:text-peach underline-offset-2 hover:underline"
        >
          Open-Meteo
        </a>{" "}
        · Last updated {new Date(data.fetchedAt).toLocaleString()}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Droplets;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 text-textSecondary" />
        <p className="text-[10px] text-textSecondary uppercase tracking-wider">
          {label}
        </p>
      </div>
      <p className="text-sm text-textPrimary font-medium">{value}</p>
    </div>
  );
}

function OutlookCard({
  label,
  forecast,
}: {
  label: string;
  forecast: ReturnType<typeof fetchWeather> extends Promise<infer T>
    ? T extends WeatherData
      ? WeatherData["daily"][number]
      : never
    : never;
}) {
  const outlook = kanchanjangaOutlook(forecast);
  return (
    <div className="rounded-xl border border-purpleDark/60 bg-midnight/40 p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-textPrimary font-medium">{label}</p>
        <Eye className={`w-4 h-4 ${outlook.colorClass}`} />
      </div>
      <div className="flex items-end gap-3 mb-4">
        <span className={`font-serif text-4xl ${outlook.colorClass}`}>
          {outlook.score}
        </span>
        <span className="text-xs text-textSecondary pb-1.5">
          / 100 · {outlook.label}
        </span>
      </div>
      <div className="h-2 rounded-full bg-purpleDark/60 overflow-hidden mb-4">
        <div
          className={`h-full ${outlook.barClass} transition-all duration-1000`}
          style={{ width: `${outlook.score}%` }}
        />
      </div>
      <div className="grid grid-cols-3 gap-3 text-[11px]">
        <div>
          <p className="text-textSecondary mb-0.5">AM Cloud</p>
          <p className="text-textPrimary">{forecast.morningCloudCover}%</p>
        </div>
        <div>
          <p className="text-textSecondary mb-0.5">Rain</p>
          <p className="text-textPrimary">
            {forecast.precipitationProbability}%
          </p>
        </div>
        <div>
          <p className="text-textSecondary mb-0.5">Temp</p>
          <p className="text-textPrimary">
            {Math.round(forecast.tempMin)}° / {Math.round(forecast.tempMax)}°
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Winter tips — always visible
// ---------------------------------------------------------------------------

function WinterTips() {
  return (
    <Reveal delay={0.15}>
      <div className="mt-8 rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-6">
        <div className="flex items-center gap-2 mb-5">
          <AlertTriangle className="w-4 h-4 text-gold" />
          <h2 className="font-serif text-lg text-textPrimary">Good to know</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-textSecondary leading-relaxed">
          <div>
            <p className="text-textPrimary font-medium mb-1">
              Fog delays in December
            </p>
            <p className="text-xs">
              Northern mornings are often foggy. Allow extra time for road
              travel and don't rely on a precise schedule for the first hours of
              daylight.
            </p>
          </div>
          <div>
            <p className="text-textPrimary font-medium mb-1">
              Mountain visibility is never guaranteed
            </p>
            <p className="text-xs">
              Even on clear-forecast days, haze and distance can hide
              Kanchanjanga. Treat any sighting as a gift, not a certainty.
            </p>
          </div>
          <div>
            <p className="text-textPrimary font-medium mb-1">
              Temperature swings
            </p>
            <p className="text-xs">
              Days can reach 22–24°C while early mornings drop to 8–10°C. Layer
              accordingly and keep a jacket accessible.
            </p>
          </div>
          <div>
            <p className="text-textPrimary font-medium mb-1">
              Data source disclosure
            </p>
            <p className="text-xs">
              Weather data comes from Open-Meteo. It is a forecast, not a
              guarantee. Always verify locally before making decisions.
            </p>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
