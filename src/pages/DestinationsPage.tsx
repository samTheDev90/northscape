import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  MapPin,
  Pencil,
  Trash2,
  Search,
  Coins,
  Clock,
  Images,
  X,
  Map as MapIcon,
  List,
} from "lucide-react";
import { useStore } from "../lib/store";
import { useAuth } from "../lib/auth";
import { useToast } from "../components/Toast";
import { useConfirm } from "../components/ConfirmProvider";
import { formatBDT } from "../lib/money";
import Modal from "../components/Modal";
import Button from "../components/PrimaryButton";
import AdminOnly from "../components/AdminOnly";
import ImageUpload from "../components/ImageUpload";
import DestinationMap from "../components/DestinationMap";
import { Select, TextArea, TextInput } from "../components/FormField";
import EmptyState from "../components/EmptyState";
import Reveal from "../components/Reveal";
import { Skeleton, SkeletonGrid } from "../components/Skeleton";
import type {
  Destination,
  DestinationPriority,
  DestinationStatus,
} from "../lib/types";

const PRIORITY_META: Record<
  DestinationPriority,
  { label: string; className: string }
> = {
  must: {
    label: "Must visit",
    className: "bg-coral/20 text-coral border-coral/40",
  },
  high: {
    label: "High priority",
    className: "bg-peach/20 text-peach border-peach/40",
  },
  optional: {
    label: "Optional",
    className: "bg-purpleDark/60 text-textSecondary border-purpleDark",
  },
  backup: {
    label: "Backup",
    className: "bg-indigoDeep text-textSecondary border-purpleDark",
  },
};

type Filter = "all" | DestinationPriority;
type ViewMode = "grid" | "map";

export default function DestinationsPage() {
  const { data, ready, addDestination, updateDestination, removeDestination } =
    useStore();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Destination | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<"name" | "priority" | "recent">(
    "priority",
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = data.destinations.filter((d) => {
      if (filter !== "all" && d.priority !== filter) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        d.location.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q)
      );
    });

    const priorityRank: Record<DestinationPriority, number> = {
      must: 0,
      high: 1,
      optional: 2,
      backup: 3,
    };

    list = [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "recent")
        return (b.createdAt || "").localeCompare(a.createdAt || "");
      return priorityRank[a.priority] - priorityRank[b.priority];
    });
    return list;
  }, [data.destinations, query, filter, sortBy]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      all: data.destinations.length,
      must: 0,
      high: 0,
      optional: 0,
      backup: 0,
    };
    for (const d of data.destinations) c[d.priority]++;
    return c;
  }, [data.destinations]);

  const handleRemove = async (d: Destination) => {
    const ok = await confirm({
      title: `Remove "${d.name}"?`,
      message: "This destination and its article will be permanently removed.",
      confirmText: "Remove",
      danger: true,
    });
    if (ok) {
      removeDestination(d.id);
      toast.success(`${d.name} removed`, "Destination deleted");
    }
  };

  if (!ready) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 md:py-10">
        <Skeleton className="h-8 w-56 mb-3" />
        <Skeleton className="h-3 w-72 mb-6" />
        <Skeleton className="h-10 w-full mb-6 rounded-lg" />
        <SkeletonGrid count={6} />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6 pv-fade-up">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl text-textPrimary mb-1">
            Destinations
          </h1>
          <p className="text-textSecondary text-sm">
            {isAdmin
              ? "Editable catalog of places to visit. Click any card to open its article."
              : "Places we're visiting in Panchagarh. Click to read more."}
          </p>
        </div>
        <AdminOnly>
          <Button onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4" /> Add Destination
          </Button>
        </AdminOnly>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6 pv-fade-up">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-textSecondary absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search destinations…"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-midnight/60 border border-purpleDark/70 text-textPrimary text-sm focus:outline-none focus:border-peach/60"
          />
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-midnight/60 border border-purpleDark/60">
          <button
            onClick={() => setView("grid")}
            className={`px-3 py-1.5 rounded-md text-xs inline-flex items-center gap-1.5 transition-colors ${
              view === "grid"
                ? "bg-peach text-midnight font-medium"
                : "text-textSecondary hover:text-textPrimary"
            }`}
          >
            <List className="w-3.5 h-3.5" /> Grid
          </button>
          <button
            onClick={() => setView("map")}
            className={`px-3 py-1.5 rounded-md text-xs inline-flex items-center gap-1.5 transition-colors ${
              view === "map"
                ? "bg-peach text-midnight font-medium"
                : "text-textSecondary hover:text-textPrimary"
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" /> Map
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {(["all", "must", "high", "optional", "backup"] as Filter[]).map(
            (f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-colors capitalize ${
                  filter === f
                    ? "bg-peach text-midnight font-medium"
                    : "bg-indigoDeep border border-purpleDark/60 text-textSecondary hover:text-textPrimary"
                }`}
              >
                {f === "all" ? "All" : PRIORITY_META[f].label}
                <span className="ml-1.5 opacity-70">{counts[f]}</span>
              </button>
            ),
          )}
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="px-3 py-2 rounded-lg bg-midnight/60 border border-purpleDark/70 text-textPrimary text-sm focus:outline-none focus:border-peach/60"
        >
          <option value="priority">Sort: Priority</option>
          <option value="name">Sort: Name</option>
          <option value="recent">Sort: Recent</option>
        </select>
      </div>

      {data.destinations.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No destinations yet"
          description={
            isAdmin
              ? "Add your first destination. You can write a full article for each one."
              : "The organizer hasn't added destinations yet."
          }
          action={
            isAdmin ? (
              <Button onClick={() => setCreating(true)}>
                <Plus className="w-4 h-4" /> Add Destination
              </Button>
            ) : undefined
          }
        />
      ) : view === "map" ? (
        <Reveal>
          <DestinationMap destinations={filtered} height={520} />
          <p className="text-[11px] text-textSecondary mt-3 text-center">
            Pins show every destination that has coordinates. Add latitude and
            longitude via Edit → Location coordinates to place a pin.
          </p>
        </Reveal>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-textSecondary text-sm">
          No destinations match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {filtered.map((d, i) => (
            <Reveal key={d.id} delay={Math.min(i * 0.06, 0.35)}>
              <DestinationCard
                destination={d}
                canEdit={isAdmin}
                onEdit={() => setEditing(d)}
                onRemove={() => handleRemove(d)}
              />
            </Reveal>
          ))}
        </div>
      )}

      <AdminOnly>
        <>
          <DestinationModal
            open={creating}
            onClose={() => setCreating(false)}
            onSave={(payload) => {
              addDestination(payload);
              setCreating(false);
              toast.success("Destination added", "Saved");
            }}
          />
          <DestinationModal
            open={editing !== null}
            onClose={() => setEditing(null)}
            initial={editing ?? undefined}
            onSave={(payload) => {
              if (editing) updateDestination(editing.id, payload);
              setEditing(null);
              toast.success("Destination updated", "Saved");
            }}
          />
        </>
      </AdminOnly>
    </div>
  );
}

function DestinationCard({
  destination: d,
  canEdit,
  onEdit,
  onRemove,
}: {
  destination: Destination;
  canEdit: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const meta = PRIORITY_META[d.priority];
  const cover =
    d.coverImageUrl ||
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=70";

  const timeLabel =
    d.timeNeeded ||
    (d.recommendedVisitMinutes ? `${d.recommendedVisitMinutes} min` : "");

  const costLabel =
    d.estCost ||
    (d.entryFee === null
      ? ""
      : d.entryFee === 0
        ? "Free"
        : formatBDT(d.entryFee));

  return (
    <div className="group rounded-2xl overflow-hidden border border-purpleDark/60 bg-indigoDeep/70 hover:border-peach/40 transition-colors flex flex-col h-full pv-card-strong relative">
      <Link
        to={`/destinations/${d.id}`}
        className="relative h-48 overflow-hidden block"
      >
        <img
          src={cover}
          alt={d.name}
          className="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-[1.08] pv-img-zoom"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-indigoDeep via-indigoDeep/40 to-transparent" />

        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span
            className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${meta.className} backdrop-blur`}
          >
            {meta.label}
          </span>
          {d.category && (
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border bg-midnight/60 text-peach border-peach/40 backdrop-blur">
              {d.category}
            </span>
          )}
        </div>

        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span className="text-[11px] text-textPrimary/90 tracking-wider inline-flex items-center gap-1">
            READ ARTICLE <span aria-hidden>→</span>
          </span>
        </div>
      </Link>

      {canEdit && (
        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            onClick={(e) => {
              e.preventDefault();
              onEdit();
            }}
            className="p-1.5 rounded-lg bg-midnight/70 backdrop-blur hover:bg-purpleDark text-textPrimary"
            aria-label="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              onRemove();
            }}
            className="p-1.5 rounded-lg bg-midnight/70 backdrop-blur hover:bg-coral/40 text-coral"
            aria-label="Remove"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="p-5 flex-1 flex flex-col">
        <Link to={`/destinations/${d.id}`} className="block mb-2">
          <h3 className="font-serif text-lg text-textPrimary hover:text-peach transition-colors inline-flex items-center gap-2">
            <MapPin className="w-4 h-4 text-coral" />
            {d.name}
          </h3>
        </Link>
        {d.description && (
          <p className="text-xs text-textSecondary line-clamp-3 mb-3">
            {d.description}
          </p>
        )}

        <div className="mt-auto pt-3 border-t border-purpleDark/40 grid grid-cols-2 gap-2">
          {timeLabel && (
            <div className="inline-flex items-center gap-1.5 text-[11px] text-textSecondary px-2.5 py-1.5 rounded-lg bg-midnight/40 border border-purpleDark/40">
              <Clock className="w-3 h-3" />
              {timeLabel}
            </div>
          )}
          {costLabel && (
            <div className="inline-flex items-center gap-1.5 text-[11px] text-textSecondary px-2.5 py-1.5 rounded-lg bg-midnight/40 border border-purpleDark/40">
              <Coins className="w-3 h-3" />
              {costLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface DestinationPayload {
  name: string;
  description: string;
  coverImageUrl: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  priority: DestinationPriority;
  entryFee: number | null;
  estimatedTravelMinutes: number | null;
  recommendedVisitMinutes: number | null;
  distanceFromPreviousKm: number | null;
  bestTimeToVisit: string;
  accessibilityNotes: string;
  openingHours: string;
  foodAvailable: boolean;
  toiletsAvailable: boolean;
  mapLink: string;
  sourceNote: string;
  verified: boolean;
  category: string;
  bestTime: string;
  timeNeeded: string;
  estCost: string;
  status: DestinationStatus;
  overview: string;
  highlights: string;
  originStory: string;
  history: string;
  visitingTips: string[];
  galleryImageUrls: string[];
  articleAuthor: string;
}

function DestinationModal({
  open,
  onClose,
  initial,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Destination;
  onSave: (payload: DestinationPayload) => void;
}) {
  const [tab, setTab] = useState<"basic" | "article">("basic");

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(
    initial?.coverImageUrl ?? "",
  );
  const [location, setLocation] = useState(initial?.location ?? "");
  const [latitude, setLatitude] = useState<string>(
    initial?.latitude != null ? String(initial.latitude) : "",
  );
  const [longitude, setLongitude] = useState<string>(
    initial?.longitude != null ? String(initial.longitude) : "",
  );
  const [priority, setPriority] = useState<DestinationPriority>(
    initial?.priority ?? "optional",
  );
  const [entryFee, setEntryFee] = useState<string>(
    initial?.entryFee === null || initial?.entryFee === undefined
      ? ""
      : String(initial.entryFee),
  );
  const [travelMinutes, setTravelMinutes] = useState<string>(
    initial?.estimatedTravelMinutes?.toString() ?? "",
  );
  const [visitMinutes, setVisitMinutes] = useState<string>(
    initial?.recommendedVisitMinutes?.toString() ?? "",
  );
  const [distanceKm, setDistanceKm] = useState<string>(
    initial?.distanceFromPreviousKm?.toString() ?? "",
  );
  const [bestTimeToVisit, setBestTimeToVisit] = useState(
    initial?.bestTimeToVisit ?? "",
  );
  const [accessibilityNotes, setAccessibilityNotes] = useState(
    initial?.accessibilityNotes ?? "",
  );
  const [openingHours, setOpeningHours] = useState(initial?.openingHours ?? "");
  const [foodAvailable, setFoodAvailable] = useState(
    initial?.foodAvailable ?? false,
  );
  const [toiletsAvailable, setToiletsAvailable] = useState(
    initial?.toiletsAvailable ?? false,
  );
  const [mapLink, setMapLink] = useState(initial?.mapLink ?? "");
  const [sourceNote, setSourceNote] = useState(initial?.sourceNote ?? "");
  const [verified, setVerified] = useState(initial?.verified ?? false);

  const [category, setCategory] = useState(initial?.category ?? "");
  const [bestTime, setBestTime] = useState(initial?.bestTime ?? "");
  const [timeNeeded, setTimeNeeded] = useState(initial?.timeNeeded ?? "");
  const [estCost, setEstCost] = useState(initial?.estCost ?? "");
  const [status, setStatus] = useState<DestinationStatus>(
    initial?.status ?? "planned",
  );
  const [overview, setOverview] = useState(initial?.overview ?? "");
  const [highlights, setHighlights] = useState(initial?.highlights ?? "");
  const [originStory, setOriginStory] = useState(initial?.originStory ?? "");
  const [history, setHistory] = useState(initial?.history ?? "");
  const [visitingTipsText, setVisitingTipsText] = useState(
    (initial?.visitingTips ?? []).join("\n"),
  );
  const [galleryUrls, setGalleryUrls] = useState<string[]>(
    initial?.galleryImageUrls ?? [],
  );
  const [articleAuthor, setArticleAuthor] = useState(
    initial?.articleAuthor ?? "",
  );

  const [lastId, setLastId] = useState<string | null>(initial?.id ?? null);
  if (open && (initial?.id ?? null) !== lastId) {
    setLastId(initial?.id ?? null);
    setTab("basic");

    setName(initial?.name ?? "");
    setDescription(initial?.description ?? "");
    setCoverImageUrl(initial?.coverImageUrl ?? "");
    setLocation(initial?.location ?? "");
    setLatitude(initial?.latitude != null ? String(initial.latitude) : "");
    setLongitude(initial?.longitude != null ? String(initial.longitude) : "");
    setPriority(initial?.priority ?? "optional");
    setEntryFee(
      initial?.entryFee === null || initial?.entryFee === undefined
        ? ""
        : String(initial.entryFee),
    );
    setTravelMinutes(initial?.estimatedTravelMinutes?.toString() ?? "");
    setVisitMinutes(initial?.recommendedVisitMinutes?.toString() ?? "");
    setDistanceKm(initial?.distanceFromPreviousKm?.toString() ?? "");
    setBestTimeToVisit(initial?.bestTimeToVisit ?? "");
    setAccessibilityNotes(initial?.accessibilityNotes ?? "");
    setOpeningHours(initial?.openingHours ?? "");
    setFoodAvailable(initial?.foodAvailable ?? false);
    setToiletsAvailable(initial?.toiletsAvailable ?? false);
    setMapLink(initial?.mapLink ?? "");
    setSourceNote(initial?.sourceNote ?? "");
    setVerified(initial?.verified ?? false);

    setCategory(initial?.category ?? "");
    setBestTime(initial?.bestTime ?? "");
    setTimeNeeded(initial?.timeNeeded ?? "");
    setEstCost(initial?.estCost ?? "");
    setStatus(initial?.status ?? "planned");
    setOverview(initial?.overview ?? "");
    setHighlights(initial?.highlights ?? "");
    setOriginStory(initial?.originStory ?? "");
    setHistory(initial?.history ?? "");
    setVisitingTipsText((initial?.visitingTips ?? []).join("\n"));
    setGalleryUrls(initial?.galleryImageUrls ?? []);
    setArticleAuthor(initial?.articleAuthor ?? "");
  }

  const canSave = name.trim().length > 0;

  const toNumOrNull = (s: string): number | null => {
    const n = Number(s);
    return s.trim() === "" || !Number.isFinite(n) ? null : n;
  };

  const parseLines = (s: string): string[] =>
    s
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      description: description.trim(),
      coverImageUrl: coverImageUrl.trim(),
      location: location.trim(),
      latitude: toNumOrNull(latitude),
      longitude: toNumOrNull(longitude),
      priority,
      entryFee: toNumOrNull(entryFee),
      estimatedTravelMinutes: toNumOrNull(travelMinutes),
      recommendedVisitMinutes: toNumOrNull(visitMinutes),
      distanceFromPreviousKm: toNumOrNull(distanceKm),
      bestTimeToVisit: bestTimeToVisit.trim(),
      accessibilityNotes: accessibilityNotes.trim(),
      openingHours: openingHours.trim(),
      foodAvailable,
      toiletsAvailable,
      mapLink: mapLink.trim(),
      sourceNote: sourceNote.trim(),
      verified,
      category: category.trim(),
      bestTime: bestTime.trim(),
      timeNeeded: timeNeeded.trim(),
      estCost: estCost.trim(),
      status,
      overview: overview.trim(),
      highlights: highlights.trim(),
      originStory: originStory.trim(),
      history: history.trim(),
      visitingTips: parseLines(visitingTipsText),
      galleryImageUrls: galleryUrls.filter((u) => u.trim().length > 0),
      articleAuthor: articleAuthor.trim(),
    });
  };

  const updateGalleryAt = (idx: number, url: string) => {
    setGalleryUrls((prev) => prev.map((u, i) => (i === idx ? url : u)));
  };
  const removeGalleryAt = (idx: number) => {
    setGalleryUrls((prev) => prev.filter((_, i) => i !== idx));
  };
  const addGallerySlot = () => {
    setGalleryUrls((prev) => [...prev, ""]);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Edit Destination" : "New Destination"}
      width="lg"
    >
      <div className="flex items-center gap-1 p-1 rounded-xl bg-midnight/60 border border-purpleDark/60 mb-5">
        <button
          type="button"
          onClick={() => setTab("basic")}
          className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
            tab === "basic"
              ? "bg-peach text-midnight font-medium"
              : "text-textSecondary hover:text-textPrimary"
          }`}
        >
          Basic info
        </button>
        <button
          type="button"
          onClick={() => setTab("article")}
          className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
            tab === "article"
              ? "bg-peach text-midnight font-medium"
              : "text-textSecondary hover:text-textPrimary"
          }`}
        >
          Article & media
        </button>
      </div>

      {tab === "basic" ? (
        <div className="space-y-4">
          <TextInput
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Banglabandha Zero Point"
            autoFocus
          />

          <TextInput
            label="Location (short)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Tetulia, Panchagarh"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TextInput
              label="Latitude (optional)"
              type="number"
              step="any"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="e.g. 26.6333"
              hint="Used to place the destination on the map."
            />
            <TextInput
              label="Longitude (optional)"
              type="number"
              step="any"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="e.g. 88.4000"
              hint="Right-click a spot on Google Maps to copy coordinates."
            />
          </div>

          <TextArea
            label="Short description (shown on the card)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="One or two sentences that summarize the place."
          />

          <ImageUpload
            label="Cover image"
            value={coverImageUrl}
            onChange={setCoverImageUrl}
            aspectClass="aspect-video"
            hint="This is the big image shown at the top of the article and on the card."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select
              label="Priority"
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value as DestinationPriority)
              }
            >
              <option value="must">Must visit</option>
              <option value="high">High priority</option>
              <option value="optional">Optional</option>
              <option value="backup">Backup</option>
            </Select>
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as DestinationStatus)}
            >
              <option value="planned">Planned</option>
              <option value="visited">Visited</option>
              <option value="wishlist">Wishlist</option>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TextInput
              label="Opening hours (optional)"
              value={openingHours}
              onChange={(e) => setOpeningHours(e.target.value)}
              placeholder="e.g. Sunrise to sunset"
            />
            <TextInput
              label="Best time to visit"
              value={bestTimeToVisit}
              onChange={(e) => setBestTimeToVisit(e.target.value)}
              placeholder="e.g. Early morning in winter"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <TextInput
              label="Entry fee (৳, blank = unknown)"
              type="number"
              min={0}
              value={entryFee}
              onChange={(e) => setEntryFee(e.target.value)}
            />
            <TextInput
              label="Travel time (min)"
              type="number"
              min={0}
              value={travelMinutes}
              onChange={(e) => setTravelMinutes(e.target.value)}
            />
            <TextInput
              label="Recommended visit (min)"
              type="number"
              min={0}
              value={visitMinutes}
              onChange={(e) => setVisitMinutes(e.target.value)}
            />
          </div>

          <TextInput
            label="Distance from previous stop (km)"
            type="number"
            min={0}
            value={distanceKm}
            onChange={(e) => setDistanceKm(e.target.value)}
          />

          <TextArea
            label="Accessibility / practical notes"
            value={accessibilityNotes}
            onChange={(e) => setAccessibilityNotes(e.target.value)}
            placeholder="Roads, terrain, walking required…"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-purpleDark/70 bg-midnight/40 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={foodAvailable}
                onChange={(e) => setFoodAvailable(e.target.checked)}
                className="accent-peach"
              />
              <span className="text-textPrimary">Food available nearby</span>
            </label>
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-purpleDark/70 bg-midnight/40 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={toiletsAvailable}
                onChange={(e) => setToiletsAvailable(e.target.checked)}
                className="accent-peach"
              />
              <span className="text-textPrimary">Toilets available</span>
            </label>
          </div>

          <TextInput
            label="Map link (Google Maps, optional)"
            value={mapLink}
            onChange={(e) => setMapLink(e.target.value)}
            placeholder="https://maps.google.com/…"
          />

          <TextArea
            label="Source / verification note"
            value={sourceNote}
            onChange={(e) => setSourceNote(e.target.value)}
            placeholder="Where this info came from, and when."
          />

          <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-purpleDark/70 bg-midnight/40 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={verified}
              onChange={(e) => setVerified(e.target.checked)}
              className="accent-peach"
            />
            <span className="text-textPrimary">
              I have verified the key details above
            </span>
          </label>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-[11px] text-textSecondary leading-relaxed">
            These fields build the destination's full article page. Leave any
            field blank to hide that section.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TextInput
              label="Category (shown as a tag)"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Nature, Landmark, Heritage"
            />
            <TextInput
              label="Author byline"
              value={articleAuthor}
              onChange={(e) => setArticleAuthor(e.target.value)}
              placeholder="e.g. Trip Organizer"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <TextInput
              label="Best time (quick fact)"
              value={bestTime}
              onChange={(e) => setBestTime(e.target.value)}
              placeholder="e.g. Sunrise"
            />
            <TextInput
              label="Time needed (quick fact)"
              value={timeNeeded}
              onChange={(e) => setTimeNeeded(e.target.value)}
              placeholder="e.g. 1–2 hrs"
            />
            <TextInput
              label="Est. cost (quick fact)"
              value={estCost}
              onChange={(e) => setEstCost(e.target.value)}
              placeholder="e.g. Free or ৳50"
            />
          </div>

          <TextArea
            label="Overview — 'About this place'"
            value={overview}
            onChange={(e) => setOverview(e.target.value)}
            placeholder="A couple of paragraphs introducing the place."
          />

          <TextArea
            label="Specialty & highlights"
            value={highlights}
            onChange={(e) => setHighlights(e.target.value)}
            placeholder="What makes this place special or unique."
          />

          <TextArea
            label="Origin story (shown as a quote)"
            value={originStory}
            onChange={(e) => setOriginStory(e.target.value)}
            placeholder="Local legend, name origin, or founding story."
          />

          <TextArea
            label="History"
            value={history}
            onChange={(e) => setHistory(e.target.value)}
            placeholder="Historical background or context."
          />

          <TextArea
            label="Visiting tips (one per line)"
            value={visitingTipsText}
            onChange={(e) => setVisitingTipsText(e.target.value)}
            placeholder={"Start before sunrise.\nCarry a flashlight."}
            hint="Each line becomes a bullet in the sidebar."
          />

          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Images className="w-4 h-4 text-peach" />
                <span className="text-xs text-textSecondary">
                  Gallery ({galleryUrls.filter((u) => u.trim()).length})
                </span>
              </div>
              <button
                type="button"
                onClick={addGallerySlot}
                className="text-xs text-peach hover:text-coral inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add photo
              </button>
            </div>

            {galleryUrls.length === 0 ? (
              <div className="rounded-xl border border-dashed border-purpleDark/60 bg-midnight/30 p-6 text-center">
                <Images className="w-6 h-6 mx-auto text-textSecondary mb-2" />
                <p className="text-xs text-textSecondary">
                  No gallery photos yet. Click "Add photo" to upload.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {galleryUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-purpleDark/60 bg-midnight/30 p-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <ImageUpload
                          label={`Photo ${idx + 1}`}
                          value={url}
                          onChange={(newUrl) => updateGalleryAt(idx, newUrl)}
                          aspectClass="aspect-square"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeGalleryAt(idx)}
                        className="p-2 rounded-lg hover:bg-coral/20 text-coral shrink-0 mt-5"
                        aria-label="Remove photo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-5 mt-5 border-t border-purpleDark/40">
        <button
          onClick={onClose}
          className="text-sm text-textSecondary hover:text-textPrimary"
        >
          Cancel
        </button>
        <Button onClick={handleSave} disabled={!canSave}>
          {initial ? "Save changes" : "Add destination"}
        </Button>
      </div>
    </Modal>
  );
}
