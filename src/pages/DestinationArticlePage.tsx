import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Coins,
  Calendar,
  BookOpen,
  Sparkles,
  Quote,
  History as HistoryIcon,
  Lightbulb,
  Images,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { useStore } from "../lib/store";
import { formatBDT } from "../lib/money";
import Button from "../components/PrimaryButton";
import EmptyState from "../components/EmptyState";

const PRIORITY_LABELS: Record<string, string> = {
  must: "Must visit",
  high: "High priority",
  optional: "Optional",
  backup: "Backup",
};

const PRIORITY_CLASSES: Record<string, string> = {
  must: "bg-coral/20 text-coral border-coral/50",
  high: "bg-peach/20 text-peach border-peach/50",
  optional: "bg-purpleDark/60 text-textSecondary border-purpleDark",
  backup: "bg-indigoDeep text-textSecondary border-purpleDark",
};

const STATUS_LABELS: Record<string, string> = {
  planned: "Planned",
  visited: "Visited",
  wishlist: "Wishlist",
};

export default function DestinationArticlePage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useStore();
  const navigate = useNavigate();

  const destination = useMemo(
    () => data.destinations.find((d) => d.id === id),
    [data.destinations, id],
  );

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Scroll to top whenever we change destination
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [id]);

  if (!destination) {
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-16">
        <EmptyState
          icon={AlertCircle}
          title="Destination not found"
          description="This destination may have been removed."
          action={
            <Link to="/destinations">
              <Button>
                <ArrowLeft className="w-4 h-4" /> All destinations
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const d = destination;
  const cover =
    d.coverImageUrl ||
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1600&q=80";

  const hasArticle =
    d.overview ||
    d.highlights ||
    d.originStory ||
    d.history ||
    d.visitingTips.length > 0 ||
    d.galleryImageUrls.length > 0;

  // Approximate read time
  const words = [d.overview, d.highlights, d.originStory, d.history]
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  const readMinutes = Math.max(1, Math.round(words / 200));

  return (
    <div className="pb-16">
      {/* ==================== HERO ==================== */}
      <section className="relative h-[60vh] min-h-[400px] max-h-[640px] overflow-hidden">
        <img
          src={cover}
          alt={d.name}
          className="absolute inset-0 w-full h-full object-cover pv-fade-in"
          style={{ animationDuration: "1.2s" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/60 to-midnight/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-midnight/70 via-transparent to-transparent" />

        <div className="absolute top-5 left-4 md:left-6 z-10">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-midnight/60 backdrop-blur-md border border-purpleDark/60 text-textPrimary text-xs hover:bg-midnight/80 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> All spots
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <div className="max-w-4xl mx-auto px-4 md:px-6 pb-8 md:pb-12">
            {/* Tags */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {d.category && (
                <span className="text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-midnight/70 backdrop-blur border border-peach/40 text-peach inline-flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  {d.category}
                </span>
              )}
              <span
                className={`text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-full border backdrop-blur ${
                  PRIORITY_CLASSES[d.priority]
                }`}
              >
                {PRIORITY_LABELS[d.priority]}
              </span>
            </div>

            <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl text-textPrimary leading-[1.05] mb-4 pv-fade-up">
              {d.name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm text-textSecondary pv-fade-up pv-delay-1">
              {d.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {d.location}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {readMinutes} min read
              </span>
              {d.articleAuthor && (
                <span className="inline-flex items-center gap-1.5">
                  by {d.articleAuthor}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== QUICK FACTS ==================== */}
      <section className="max-w-4xl mx-auto px-4 md:px-6 -mt-10 md:-mt-12 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickFact
            icon={Calendar}
            label="Best time"
            value={d.bestTime || d.bestTimeToVisit || "Any time"}
          />
          <QuickFact
            icon={Clock}
            label="Time needed"
            value={
              d.timeNeeded ||
              (d.recommendedVisitMinutes
                ? `${d.recommendedVisitMinutes} min`
                : "Flexible")
            }
          />
          <QuickFact
            icon={Coins}
            label="Est. cost"
            value={
              d.estCost ||
              (d.entryFee === null
                ? "Unknown"
                : d.entryFee === 0
                  ? "Free"
                  : formatBDT(d.entryFee))
            }
          />
          <QuickFact
            icon={MapPin}
            label="Status"
            value={STATUS_LABELS[d.status]}
          />
        </div>
      </section>

      {/* ==================== ARTICLE ==================== */}
      <section className="max-w-4xl mx-auto px-4 md:px-6 py-10 md:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main content column */}
          <div className="lg:col-span-8 space-y-10">
            {/* About */}
            {(d.overview || d.description) && (
              <ArticleSection
                icon={BookOpen}
                kicker="Overview"
                title="About this place"
              >
                <p className="whitespace-pre-line leading-relaxed text-textSecondary">
                  {d.overview || d.description}
                </p>
              </ArticleSection>
            )}

            {/* Highlights */}
            {d.highlights && (
              <ArticleSection
                icon={Sparkles}
                kicker="What makes it special"
                title="Specialty & highlights"
              >
                <div className="rounded-2xl border border-peach/25 bg-peach/5 p-5 md:p-6">
                  <p className="whitespace-pre-line leading-relaxed text-textSecondary">
                    {d.highlights}
                  </p>
                </div>
              </ArticleSection>
            )}

            {/* Origin story */}
            {d.originStory && (
              <ArticleSection
                icon={Quote}
                kicker="The story"
                title="Origin story"
              >
                <div className="border-l-2 border-peach pl-5 md:pl-6">
                  <p className="whitespace-pre-line italic text-lg md:text-xl leading-relaxed text-textPrimary/90 font-serif">
                    {d.originStory}
                  </p>
                </div>
              </ArticleSection>
            )}

            {/* History */}
            {d.history && (
              <ArticleSection
                icon={HistoryIcon}
                kicker="Background"
                title="History"
              >
                <p className="whitespace-pre-line leading-relaxed text-textSecondary">
                  {d.history}
                </p>
              </ArticleSection>
            )}

            {!hasArticle && (
              <div className="rounded-2xl border border-dashed border-purpleDark/60 p-8 text-center text-sm text-textSecondary">
                <p className="mb-2 text-textPrimary font-medium">
                  The article hasn't been written yet
                </p>
                <p>
                  {d.description ||
                    "The organizer will add origin, history, and highlights soon."}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-20 space-y-5">
              {/* Visiting tips */}
              {d.visitingTips.length > 0 && (
                <div className="rounded-2xl border border-gold/30 bg-gold/5 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Lightbulb className="w-4 h-4 text-gold" />
                    <h3 className="font-serif text-base text-textPrimary">
                      Good to know
                    </h3>
                  </div>
                  <ul className="space-y-3">
                    {d.visitingTips.map((tip, i) => (
                      <li
                        key={i}
                        className="text-xs text-textSecondary leading-relaxed pl-3 relative before:absolute before:left-0 before:top-2 before:w-1 before:h-1 before:rounded-full before:bg-gold"
                      >
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Practical info */}
              <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-5">
                <h3 className="font-serif text-base text-textPrimary mb-4">
                  Practical info
                </h3>
                <div className="space-y-3 text-xs">
                  {d.openingHours && (
                    <SideRow label="Hours" value={d.openingHours} />
                  )}
                  {d.estimatedTravelMinutes !== null && (
                    <SideRow
                      label="Travel time"
                      value={`${d.estimatedTravelMinutes} min`}
                    />
                  )}
                  {d.distanceFromPreviousKm !== null && (
                    <SideRow
                      label="From previous"
                      value={`${d.distanceFromPreviousKm} km`}
                    />
                  )}
                  <SideRow
                    label="Food nearby"
                    value={d.foodAvailable ? "Yes" : "Not known"}
                  />
                  <SideRow
                    label="Toilets"
                    value={d.toiletsAvailable ? "Yes" : "Not known"}
                  />
                  <SideRow
                    label="Verified"
                    value={d.verified ? "Yes" : "Not yet"}
                  />
                </div>

                {d.accessibilityNotes && (
                  <p className="mt-4 pt-4 border-t border-purpleDark/40 text-[11px] text-textSecondary leading-relaxed">
                    <span className="text-textPrimary font-medium">
                      Access:{" "}
                    </span>
                    {d.accessibilityNotes}
                  </p>
                )}

                {d.mapLink && (
                  <a
                    href={d.mapLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-purpleDark/60 hover:bg-purpleDark text-textPrimary text-xs transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open in Maps
                  </a>
                )}
              </div>

              {d.sourceNote && (
                <p className="text-[10px] text-lavenderMist text-center leading-relaxed">
                  <span className="text-textSecondary">Source: </span>
                  {d.sourceNote}
                </p>
              )}
            </div>
          </aside>
        </div>
      </section>

      {/* ==================== GALLERY ==================== */}
      {d.galleryImageUrls.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 md:px-6 pb-10">
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-1">
              <Images className="w-4 h-4 text-peach" />
              <span className="text-[11px] uppercase tracking-wider text-textSecondary">
                Gallery
              </span>
            </div>
            <h2 className="font-serif text-2xl md:text-3xl text-textPrimary">
              {d.galleryImageUrls.length}{" "}
              {d.galleryImageUrls.length === 1 ? "photo" : "photos"}
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {d.galleryImageUrls.map((url, i) => (
              <button
                key={i}
                onClick={() => setLightboxUrl(url)}
                className="group relative aspect-square rounded-2xl overflow-hidden border border-purpleDark/60 bg-indigoDeep pv-card"
              >
                <img
                  src={url}
                  alt={`${d.name} ${i + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.opacity = "0.2";
                  }}
                />
                <div className="absolute inset-0 bg-midnight/0 group-hover:bg-midnight/20 transition-colors" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ==================== BACK BUTTON ==================== */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 flex justify-center py-8">
        <Link to="/destinations">
          <Button variant="secondary">
            <ArrowLeft className="w-4 h-4" /> Back to all spots
          </Button>
        </Link>
      </div>

      {/* ==================== LIGHTBOX ==================== */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-midnight/90 backdrop-blur-sm pv-fade-in"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt=""
            className="max-w-full max-h-[90vh] rounded-2xl shadow-soft pv-scale-in"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-5 right-5 px-3 py-2 rounded-lg bg-midnight/80 border border-purpleDark/60 text-textPrimary text-xs hover:bg-midnight"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function QuickFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/90 backdrop-blur-md p-4 pv-card">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-peach" />
        <p className="text-[10px] uppercase tracking-wider text-textSecondary">
          {label}
        </p>
      </div>
      <p className="text-sm md:text-base text-textPrimary font-medium truncate">
        {value}
      </p>
    </div>
  );
}

function ArticleSection({
  icon: Icon,
  kicker,
  title,
  children,
}: {
  icon: typeof BookOpen;
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-peach" />
        <p className="text-[11px] uppercase tracking-wider text-textSecondary">
          {kicker}
        </p>
      </div>
      <h2 className="font-serif text-2xl md:text-3xl text-textPrimary mb-4">
        {title}
      </h2>
      {children}
    </section>
  );
}

function SideRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-purpleDark/30 last:border-0">
      <span className="text-textSecondary">{label}</span>
      <span className="text-textPrimary text-right">{value}</span>
    </div>
  );
}
