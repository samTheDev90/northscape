import { useState, useEffect } from "react";
import {
  UserCircle2,
  Shield,
  Mail,
  Save,
  Loader2,
  Pencil,
  X,
  Sunrise,
  Clock,
  Coffee,
  WifiOff,
  Eye,
  Shirt,
  Footprints,
  BatteryCharging,
  BadgeCheck,
  Banknote,
  Camera,
  Sparkles,
  Award,
  Leaf,
  Compass,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { useStore } from "../lib/store";
import { computeParticipantBalances } from "../lib/finance";
import { formatBDT } from "../lib/money";
import Modal from "../components/Modal";
import Button from "../components/PrimaryButton";
import ImageUpload from "../components/ImageUpload";
import { TextArea, TextInput } from "../components/FormField";

const COVER_IMG =
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=80";

const BADGES = [
  { icon: Sunrise, label: "Kanchanjanga Seeker", color: "peach" as const },
  { icon: Leaf, label: "Tea Trail Nomad", color: "forest" as const },
  { icon: Compass, label: "Border Pioneer", color: "gold" as const },
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

export default function MyProfilePage() {
  const { user, isAdmin } = useAuth();
  const { data } = useStore();
  const [editing, setEditing] = useState(false);

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-textSecondary text-sm">
        Loading profile…
      </div>
    );
  }

  const initial = (user.displayName || "?").slice(0, 1).toUpperCase();
  const trip = data.trip;

  const countdown = (() => {
    if (!trip.startDate) return null;
    const t = new Date(trip.startDate).getTime();
    if (!Number.isFinite(t)) return null;
    return Math.ceil((t - Date.now()) / (1000 * 60 * 60 * 24));
  })();

  const myContribution = data.contributions.find(
    (c) => c.participantId === user.participantId,
  );
  const balances = computeParticipantBalances(
    data.participants,
    data.contributions,
    data.expenses,
  );
  const myBalance = balances.find(
    (b) => b.participantId === user.participantId,
  );

  const confirmedCount = data.participants.filter(
    (p) => p.status === "confirmed",
  ).length;

  return (
    <div className="pb-12">
      <section className="relative h-56 md:h-72 lg:h-80 overflow-hidden">
        <img
          src={COVER_IMG}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-midnight/30 via-midnight/50 to-midnight" />
        <div className="absolute inset-0 bg-gradient-to-r from-midnight/70 via-transparent to-transparent" />

        <div className="relative max-w-5xl mx-auto px-4 md:px-6 h-full flex items-start justify-end pt-5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-midnight/60 backdrop-blur border border-purpleDark/60 text-[11px] text-textSecondary">
            <Sparkles className="w-3 h-3 text-peach" />
            Traveler Profile
          </span>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 md:px-6 -mt-20 md:-mt-24 relative z-10">
        <div className="rounded-3xl border border-purpleDark/60 bg-indigoDeep/95 backdrop-blur-xl shadow-soft p-6 md:p-7">
          <div className="flex flex-col md:flex-row md:items-center gap-5">
            <div className="shrink-0 -mt-16 md:-mt-20">
              <div className="relative">
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-indigoDeep overflow-hidden bg-purpleDark/70 flex items-center justify-center shadow-glow">
                  {user.photoUrl ? (
                    <img
                      src={user.photoUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="font-serif text-4xl text-peach">
                      {initial}
                    </span>
                  )}
                </div>
                {isAdmin && (
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gold/20 border-2 border-indigoDeep flex items-center justify-center">
                    <Shield className="w-4 h-4 text-gold" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="font-serif text-2xl md:text-3xl text-textPrimary mb-0.5 truncate">
                {user.displayName || "(no name)"}
              </h1>
              <p className="text-textSecondary text-sm">
                {isAdmin ? "Trip Organizer" : "Traveler"}
                {user.nickname ? ` · ${user.nickname}` : ""}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs mt-2">
                <span className="inline-flex items-center gap-1.5 text-textSecondary">
                  <Mail className="w-3.5 h-3.5" />
                  {user.email}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider ${
                    isAdmin
                      ? "bg-gold/15 text-gold border-gold/40"
                      : "bg-peach/15 text-peach border-peach/40"
                  }`}
                >
                  {isAdmin ? (
                    <>
                      <Shield className="w-2.5 h-2.5" /> Admin
                    </>
                  ) : (
                    <>
                      <UserCircle2 className="w-2.5 h-2.5" /> Participant
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="shrink-0">
              <Button onClick={() => setEditing(true)}>
                <Pencil className="w-4 h-4" /> Edit
              </Button>
            </div>
          </div>
        </div>

        <section className="mt-8">
          <h2 className="font-serif text-lg text-textPrimary mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-peach" />
            Adventure Badges
          </h2>
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {BADGES.map((b, i) => {
              const Icon = b.icon;
              const colorMap = {
                peach: {
                  bg: "bg-peach/15",
                  border: "border-peach/40",
                  text: "text-peach",
                },
                forest: {
                  bg: "bg-forest/15",
                  border: "border-forest/40",
                  text: "text-forest",
                },
                gold: {
                  bg: "bg-gold/15",
                  border: "border-gold/40",
                  text: "text-gold",
                },
              };
              const c = colorMap[b.color];
              return (
                <div
                  key={i}
                  className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-4 text-center hover:border-peach/40 transition-colors"
                >
                  <div
                    className={`w-12 h-12 md:w-14 md:h-14 mx-auto rounded-full ${c.bg} ${c.border} border-2 flex items-center justify-center mb-3`}
                  >
                    <Icon className={`w-5 h-5 md:w-6 md:h-6 ${c.text}`} />
                  </div>
                  <p className="text-xs md:text-sm text-textPrimary font-medium leading-tight">
                    {b.label}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatBox
            label="Days to Trip"
            value={
              countdown === null
                ? "—"
                : countdown > 0
                  ? String(countdown)
                  : countdown === 0
                    ? "Today"
                    : "—"
            }
            sub={trip.startDate ? "Until departure" : "Date not set"}
          />
          <StatBox
            label="Travelers"
            value={String(confirmedCount)}
            sub="Confirmed"
          />
          <StatBox
            label="My Contribution"
            value={
              myContribution ? formatBDT(myContribution.actualAmount) : "৳0"
            }
            sub={
              myContribution && myContribution.plannedAmount > 0
                ? `of ${formatBDT(myContribution.plannedAmount)}`
                : "No pledge yet"
            }
          />
          <StatBox
            label="My Expense Share"
            value={myBalance ? formatBDT(myBalance.owed) : "৳0"}
            sub={
              myBalance?.state === "owes"
                ? `Owes ${formatBDT(Math.abs(myBalance.net))}`
                : myBalance?.state === "receives"
                  ? `Receives ${formatBDT(myBalance.net)}`
                  : "Settled"
            }
          />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-8">
          <GuidancePanel
            title="What to Bring"
            subtitle="Pack smart for the northern winter."
            items={WHAT_TO_BRING}
            accent="peach"
          />
          <GuidancePanel
            title="What to Know"
            subtitle="Small things that make the trip smoother."
            items={WHAT_TO_KNOW}
            accent="gold"
          />
        </div>
      </div>

      <EditProfileModal open={editing} onClose={() => setEditing(false)} />
    </div>
  );
}

function StatBox({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-4 hover:border-peach/40 transition-colors">
      <p className="text-[10px] text-textSecondary uppercase tracking-wider mb-1.5">
        {label}
      </p>
      <p className="text-xl md:text-2xl font-semibold text-textPrimary mb-0.5 truncate">
        {value}
      </p>
      {sub && <p className="text-[11px] text-textSecondary truncate">{sub}</p>}
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
    <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-5 md:p-6">
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

function EditProfileModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user, updateOwnProfile } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [nickname, setNickname] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName);
    setNickname(user.nickname);
    setPhotoUrl(user.photoUrl);
    setContact(user.contact);
    setNotes(user.notes);
  }, [user, open]);

  if (!user) return null;

  const handleSave = async () => {
    setError(null);
    if (!displayName.trim()) {
      setError("Display name cannot be empty.");
      return;
    }
    setBusy(true);
    try {
      await updateOwnProfile({
        displayName,
        nickname,
        photoUrl,
        contact,
        notes,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Profile">
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg border border-coral/40 bg-coral/10 px-3 py-2 text-xs text-coral">
            {error}
          </div>
        )}

        <ImageUpload
          label="Profile photo"
          value={photoUrl}
          onChange={setPhotoUrl}
          aspectClass="aspect-square"
          hint="Square image works best. Uploaded to Cloudinary."
        />

        <TextInput
          label="Display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
        />

        <TextInput
          label="Nickname (optional)"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Short name"
        />

        <TextInput
          label="Contact (optional)"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Phone or email"
        />

        <TextArea
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything worth remembering…"
        />

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            onClick={onClose}
            className="text-sm text-textSecondary hover:text-textPrimary inline-flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
          <Button onClick={handleSave} disabled={busy}>
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}
