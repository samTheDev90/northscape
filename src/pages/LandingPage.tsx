import { Link } from "react-router-dom";
import {
  Compass,
  Calendar,
  Users,
  Wallet,
  MapPin,
  ArrowRight,
  Sunrise,
  CloudSun,
  Eye,
  Sparkles,
  TrendingUp,
  Shirt,
  Footprints,
  BatteryCharging,
  BadgeCheck,
  Banknote,
  Camera,
  Clock,
  Coffee,
  WifiOff,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { useStore } from "../lib/store";
import { useAuth } from "../lib/auth";
import { computeTripTotals } from "../lib/finance";
import { formatBDT } from "../lib/money";
import Reveal from "../components/Reveal";
import { Skeleton } from "../components/Skeleton";

const HERO_IMG =
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80";

const DEFAULT_FEATURED = [
  {
    name: "Banglabandha Zero Point",
    tag: "Border landmark",
    img: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80",
    blurb: "Northernmost tip of Bangladesh, framed by open sky.",
  },
  {
    name: "Tetulia Tea Gardens",
    tag: "Tea estate",
    img: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80",
    blurb: "Rolling green rows and cool winter mornings.",
  },
  {
    name: "Kanchanjanga Viewpoint",
    tag: "Sunrise view",
    img: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80",
    blurb: "Clear-day glimpses of the third-highest peak on Earth.",
  },
];

interface GuidanceItem {
  icon: LucideIcon;
  title: string;
  text: string;
}

const WHAT_TO_BRING: GuidanceItem[] = [
  {
    icon: Shirt,
    title: "Warm layers",
    text: "Jacket, sweater, scarf — mornings dip to 8–10°C.",
  },
  {
    icon: Footprints,
    title: "Walking shoes",
    text: "Tea garden trails and village roads are uneven.",
  },
  {
    icon: BatteryCharging,
    title: "Power bank",
    text: "The overnight train has limited charging points.",
  },
  {
    icon: BadgeCheck,
    title: "National ID",
    text: "Required at Banglabandha border checkposts.",
  },
  {
    icon: Banknote,
    title: "Cash",
    text: "ATMs are rare up north; cards rarely accepted.",
  },
  {
    icon: Camera,
    title: "Camera",
    text: "Sunrise over the tea gardens is worth capturing.",
  },
];

const WHAT_TO_KNOW: GuidanceItem[] = [
  {
    icon: Eye,
    title: "Fog delays",
    text: "December mornings are foggy — add buffer time.",
  },
  {
    icon: Sunrise,
    title: "Best mountain view",
    text: "Clearest between sunrise and 9 AM on cloudless days.",
  },
  {
    icon: Clock,
    title: "Verify train times",
    text: "Always re-check with Bangladesh Railway before the trip.",
  },
  {
    icon: Coffee,
    title: "Local tea stalls",
    text: "Fresh brews at the tea gardens are a highlight.",
  },
  {
    icon: WifiOff,
    title: "Weak signals",
    text: "Mobile network drops in remote tea estates.",
  },
  {
    icon: Shield,
    title: "Border rules",
    text: "Carry ID. Photography restrictions at Zero Point.",
  },
];

function formatDate(iso: string | null): string {
  if (!iso) return "Date not set";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Date not set";
  }
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const target = new Date(iso).getTime();
  if (!Number.isFinite(target)) return null;
  return Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function LandingPage() {
  const { data, ready } = useStore();
  const { isAdmin, isAuthenticated } = useAuth();
  const totals = computeTripTotals(data);
  const { trip, participants, destinations } = data;

  const countdown = daysUntil(trip.startDate);
  const confirmedCount = participants.filter(
    (p) => p.status === "confirmed",
  ).length;

  const featured =
    destinations.length > 0
      ? [...destinations]
          .sort((a, b) => {
            const rank: Record<string, number> = {
              must: 0,
              high: 1,
              optional: 2,
              backup: 3,
            };
            return rank[a.priority] - rank[b.priority];
          })
          .slice(0, 3)
          .map((d) => ({
            name: d.name,
            tag:
              d.priority === "must"
                ? "Must visit"
                : d.priority === "high"
                  ? "High priority"
                  : "Destination",
            img:
              d.coverImageUrl ||
              "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80",
            blurb: d.description || d.location || "A stop on the voyage.",
            id: d.id,
          }))
      : DEFAULT_FEATURED.map((f) => ({ ...f, id: undefined }));

  if (!ready) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-10 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7">
            <Skeleton className="h-6 w-40 mb-5 rounded-full" />
            <Skeleton className="h-16 w-full max-w-lg mb-3" />
            <Skeleton className="h-16 w-3/4 max-w-md mb-6" />
            <Skeleton className="h-4 w-2/3 max-w-md mb-3" />
            <Skeleton className="h-4 w-1/2 max-w-sm mb-8" />
            <div className="flex gap-3">
              <Skeleton className="h-12 w-40 rounded-xl" />
              <Skeleton className="h-12 w-40 rounded-xl" />
            </div>
          </div>
          <div className="lg:col-span-5 lg:col-start-8">
            <Skeleton className="h-72 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={HERO_IMG}
            alt=""
            className="w-full h-full object-cover scale-105 animate-[pv-fade-in_1.2s_ease-out_both]"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-midnight/70 via-indigoDeep/80 to-midnight" />
          <div className="absolute inset-0 bg-gradient-to-r from-midnight/90 via-midnight/40 to-transparent" />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-peach/10 blur-[120px] pointer-events-none" />
        </div>

        <div className="relative max-w-[1400px] mx-auto px-4 md:px-6 pt-14 pb-20 md:pt-24 md:pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7">
              <div className="pv-fade-up pv-delay-1 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-peach/30 bg-peach/5 text-peach text-xs mb-5">
                <Sunrise className="w-3.5 h-3.5" />
                Kanchanjanga Dawn
              </div>

              <h1 className="pv-fade-up pv-delay-2 font-serif text-4xl md:text-6xl lg:text-7xl leading-[1.05] mb-5 text-textPrimary">
                Explore
                <br />
                <span className="pv-gradient-text">Panchagarh</span>
              </h1>

              <p className="pv-fade-up pv-delay-3 text-textSecondary max-w-lg mb-8 text-sm md:text-base leading-relaxed">
                A winter voyage to the northern edge of Bangladesh — tea
                gardens, border mornings, and the chance of a Himalayan sunrise.
              </p>

              <div className="pv-fade-up pv-delay-4 flex flex-wrap gap-3">
                <Link
                  to="/itinerary"
                  className="pv-glow-hover inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-peach text-midnight font-medium hover:bg-coral transition-colors shadow-glow"
                >
                  <Compass className="w-4 h-4" />
                  Explore Trip
                </Link>
                <Link
                  to="/budget"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-purpleDark bg-indigoDeep/60 text-textPrimary hover:bg-purpleDark/60 transition-colors"
                >
                  <Wallet className="w-4 h-4" />
                  View Budget
                </Link>
              </div>

              {!isAuthenticated && (
                <div className="pv-fade-up pv-delay-5 mt-6 inline-flex items-center gap-2 text-xs text-textSecondary">
                  <Eye className="w-3.5 h-3.5" />
                  Browsing as visitor — read-only view
                </div>
              )}
            </div>

            <div className="lg:col-span-5 lg:col-start-8">
              <div className="pv-scale-in pv-delay-3 rounded-2xl border border-purpleDark/70 bg-indigoDeep/80 backdrop-blur-md p-6 shadow-soft pv-card">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-serif text-2xl text-textPrimary">
                    Trip Planning
                  </h2>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-forest/15 text-forest border border-forest/40 text-[10px] uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulse" />
                    Live
                  </span>
                </div>

                <div className="space-y-4">
                  <SummaryRow
                    icon={Calendar}
                    label="Dates"
                    value={
                      trip.startDate
                        ? `${formatDate(trip.startDate)}${
                            trip.endDate ? ` → ${formatDate(trip.endDate)}` : ""
                          }`
                        : "Date not set"
                    }
                  />
                  <SummaryRow
                    icon={Users}
                    label="Confirmed"
                    value={`${confirmedCount} ${
                      confirmedCount === 1 ? "traveler" : "travelers"
                    }`}
                  />
                  <SummaryRow
                    icon={Wallet}
                    label="Planned budget"
                    value={formatBDT(totals.plannedExpenseTotal)}
                  />
                  <SummaryRow
                    icon={CloudSun}
                    label="Countdown"
                    value={
                      countdown === null
                        ? "Date not set"
                        : countdown > 0
                          ? `${countdown} days to go`
                          : countdown === 0
                            ? "Today!"
                            : "Trip has passed"
                    }
                  />
                </div>

                {isAdmin && (
                  <Link
                    to="/admin"
                    className="pv-glow-hover mt-6 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-coral text-midnight text-sm font-medium hover:bg-peach transition-colors"
                  >
                    Set trip dates
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HIGHLIGHT STRIP */}
      <section className="max-w-[1400px] mx-auto px-4 md:px-6 -mt-8 md:-mt-12 relative z-10">
        <Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <HighlightCard
              icon={Users}
              label="Travelers"
              value={String(participants.length)}
              accent="peach"
            />
            <HighlightCard
              icon={MapPin}
              label="Destinations"
              value={String(destinations.length)}
              accent="coral"
            />
            <HighlightCard
              icon={Calendar}
              label="Activities"
              value={String(data.activities.length)}
              accent="gold"
            />
            <HighlightCard
              icon={TrendingUp}
              label="Planned budget"
              value={formatBDT(totals.plannedExpenseTotal)}
              accent="forest"
            />
          </div>
        </Reveal>
      </section>

      {/* TRIP SUMMARY BAND */}
      <section className="max-w-[1400px] mx-auto px-4 md:px-6 py-14 md:py-16">
        <Reveal>
          <div className="rounded-3xl border border-purpleDark/60 bg-gradient-to-br from-indigoDeep via-indigoDeep to-purpleDark/30 p-6 md:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-peach/70 mb-3 inline-flex items-center gap-2">
                  <Sparkles className="w-3 h-3" />
                  The Voyage
                </p>
                <h2 className="font-serif text-3xl md:text-4xl text-textPrimary mb-4 leading-tight">
                  A day in the northern edge of Bangladesh
                </h2>
                <p className="text-sm text-textSecondary leading-relaxed">
                  We travel overnight by train, arrive in Panchagarh in the
                  morning, spend the day exploring tea gardens, border
                  landmarks, and rural roads — then return overnight. December
                  weather keeps the mornings cold, the sky often clear, and the
                  chance of a Himalayan view alive.
                </p>
              </div>

              <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                <FactCard
                  label="Season"
                  value="December"
                  sub="Winter mornings"
                />
                <FactCard
                  label="Transport"
                  value="Overnight train"
                  sub="Verify schedule"
                />
                <FactCard
                  label="Best view"
                  value="Sunrise"
                  sub="Kanchanjanga"
                />
                <FactCard label="Duration" value="1 day" sub="Out and back" />
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* FEATURED SPOTS */}
      <section className="max-w-[1400px] mx-auto px-4 md:px-6 pb-14 md:pb-20">
        <Reveal>
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-peach/70 mb-2 inline-flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                Featured Spots
              </p>
              <h2 className="font-serif text-3xl md:text-4xl text-textPrimary">
                Where we're headed
              </h2>
              <p className="text-textSecondary text-sm mt-2 max-w-lg">
                {isAdmin
                  ? "Edit these from the Destinations page."
                  : "The highlights of our Panchagarh voyage."}
              </p>
            </div>
            <Link
              to="/destinations"
              className="hidden sm:inline-flex items-center gap-1 text-sm text-peach hover:text-coral transition-colors"
            >
              All destinations <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {featured.map((f, i) => (
            <Reveal key={f.name} delay={i * 0.12}>
              <Link
                to={f.id ? `/destinations/${f.id}` : "/destinations"}
                className="group relative rounded-2xl overflow-hidden border border-purpleDark/60 bg-indigoDeep h-72 md:h-80 block pv-card-strong"
              >
                <img
                  src={f.img}
                  alt={f.name}
                  className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-[1200ms] ease-out group-hover:scale-[1.08]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/50 to-transparent" />
                <div className="absolute top-4 left-4 px-2.5 py-1 rounded-full bg-peach/90 text-midnight text-[11px] font-medium backdrop-blur">
                  {f.tag}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
                  <h3 className="font-serif text-xl md:text-2xl text-textPrimary mb-1.5">
                    {f.name}
                  </h3>
                  <p className="text-xs text-textSecondary line-clamp-2 mb-3">
                    {f.blurb}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[11px] text-peach opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Learn more <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* GUIDANCE PANELS */}
      <section className="max-w-[1400px] mx-auto px-4 md:px-6 pb-14 md:pb-20">
        <Reveal>
          <div className="mb-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-peach/70 mb-2 inline-flex items-center gap-2">
              <Sparkles className="w-3 h-3" />
              Prepare
            </p>
            <h2 className="font-serif text-3xl md:text-4xl text-textPrimary">
              Before you go
            </h2>
            <p className="text-textSecondary text-sm mt-2 max-w-lg">
              A short list of practical reminders for the northern winter.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
          <Reveal delay={0}>
            <GuidancePanel
              title="What to Bring"
              subtitle="Pack smart for the cold mornings."
              items={WHAT_TO_BRING}
              accent="peach"
            />
          </Reveal>
          <Reveal delay={0.1}>
            <GuidancePanel
              title="What to Know"
              subtitle="Small things that make the trip smoother."
              items={WHAT_TO_KNOW}
              accent="gold"
            />
          </Reveal>
        </div>
      </section>

      {/* QUICK LINKS */}
      <section className="max-w-[1400px] mx-auto px-4 md:px-6 pb-20">
        <Reveal>
          <h2 className="font-serif text-2xl md:text-3xl text-textPrimary mb-6">
            Plan your trip
          </h2>
        </Reveal>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Reveal delay={0}>
            <QuickLink
              to="/itinerary"
              icon={Compass}
              label="Itinerary"
              hint="Day-by-day plan"
              accent="peach"
            />
          </Reveal>
          <Reveal delay={0.08}>
            <QuickLink
              to="/budget"
              icon={Wallet}
              label="Budget"
              hint="Contributions & costs"
              accent="gold"
            />
          </Reveal>
          <Reveal delay={0.16}>
            <QuickLink
              to="/destinations"
              icon={MapPin}
              label="Destinations"
              hint="Places to visit"
              accent="coral"
            />
          </Reveal>
          <Reveal delay={0.24}>
            <QuickLink
              to="/weather"
              icon={CloudSun}
              label="Weather"
              hint="Forecast & outlook"
              accent="forest"
            />
          </Reveal>
        </div>
      </section>
    </div>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 pb-3 border-b border-purpleDark/40 last:border-0 last:pb-0">
      <div className="flex items-center gap-2 text-textSecondary text-sm">
        <Icon className="w-4 h-4" />
        {label}
      </div>
      <div className="text-sm text-textPrimary text-right font-medium">
        {value}
      </div>
    </div>
  );
}

function HighlightCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  accent: "peach" | "coral" | "gold" | "forest";
}) {
  const colors: Record<string, { text: string; bg: string }> = {
    peach: { text: "text-peach", bg: "bg-peach/10" },
    coral: { text: "text-coral", bg: "bg-coral/10" },
    gold: { text: "text-gold", bg: "bg-gold/10" },
    forest: { text: "text-forest", bg: "bg-forest/10" },
  };
  const c = colors[accent];
  return (
    <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/90 backdrop-blur-md p-4 md:p-5 pv-card">
      <div
        className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${c.bg} mb-3`}
      >
        <Icon className={`w-4 h-4 ${c.text}`} />
      </div>
      <p className="text-[10px] uppercase tracking-wider text-textSecondary mb-1">
        {label}
      </p>
      <p className="text-lg md:text-xl font-semibold text-textPrimary truncate">
        {value}
      </p>
    </div>
  );
}

function FactCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-purpleDark/50 bg-midnight/40 p-4">
      <p className="text-[10px] uppercase tracking-wider text-textSecondary mb-1.5">
        {label}
      </p>
      <p className="text-base md:text-lg font-serif text-textPrimary leading-tight mb-0.5">
        {value}
      </p>
      {sub && <p className="text-[11px] text-textSecondary">{sub}</p>}
    </div>
  );
}

function GuidancePanel({
  title,
  subtitle,
  items,
  accent,
}: {
  title: string;
  subtitle: string;
  items: GuidanceItem[];
  accent: "peach" | "gold";
}) {
  const accentColor = accent === "peach" ? "text-peach" : "text-gold";
  const accentBg = accent === "peach" ? "bg-peach/10" : "bg-gold/10";
  const accentBorder =
    accent === "peach" ? "border-peach/30" : "border-gold/30";

  return (
    <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-5 md:p-6 h-full">
      <div className="mb-4">
        <h2 className="font-serif text-lg text-textPrimary mb-0.5">{title}</h2>
        <p className="text-xs text-textSecondary">{subtitle}</p>
      </div>

      <div className="space-y-2.5">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className="flex items-start gap-3">
              <div
                className={`w-8 h-8 rounded-lg ${accentBg} ${accentBorder} border flex items-center justify-center shrink-0`}
              >
                <Icon className={`w-3.5 h-3.5 ${accentColor}`} />
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="text-sm text-textPrimary font-medium leading-tight mb-0.5">
                  {item.title}
                </p>
                <p className="text-xs text-textSecondary leading-relaxed">
                  {item.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuickLink({
  to,
  icon: Icon,
  label,
  hint,
  accent,
}: {
  to: string;
  icon: typeof Calendar;
  label: string;
  hint: string;
  accent: "peach" | "coral" | "gold" | "forest";
}) {
  const colors: Record<string, string> = {
    peach: "text-peach",
    coral: "text-coral",
    gold: "text-gold",
    forest: "text-forest",
  };
  return (
    <Link
      to={to}
      className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/60 p-5 hover:bg-purpleDark/50 transition-colors group block pv-card h-full"
    >
      <Icon
        className={`w-5 h-5 ${colors[accent]} mb-3 group-hover:scale-110 transition-transform`}
      />
      <div className="text-sm text-textPrimary font-medium mb-0.5">{label}</div>
      <div className="text-[11px] text-textSecondary">{hint}</div>
    </Link>
  );
}
