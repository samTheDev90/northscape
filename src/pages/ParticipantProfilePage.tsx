import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Shield,
  CheckCircle2,
  Clock,
  XCircle,
  UserCircle2,
  Award,
  TrendingUp,
  Calendar,
  AlertCircle,
  Link2,
} from "lucide-react";
import { useStore } from "../lib/store";
import { useAuth } from "../lib/auth";
import { computeParticipantBalances } from "../lib/finance";
import { formatBDT } from "../lib/money";
import Button from "../components/PrimaryButton";
import EmptyState from "../components/EmptyState";
import { subscribeUsers, type DirectoryUser } from "../lib/userDirectory";

const COVER_IMG =
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80";

const STATUS_META: Record<
  string,
  { label: string; color: string; icon: typeof CheckCircle2 }
> = {
  confirmed: {
    label: "Confirmed",
    color: "bg-forest/20 text-forest border-forest/40",
    icon: CheckCircle2,
  },
  tentative: {
    label: "Tentative",
    color: "bg-gold/20 text-gold border-gold/40",
    icon: Clock,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-coral/20 text-coral border-coral/40",
    icon: XCircle,
  },
};

export default function ParticipantProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useStore();
  const { user, isAdmin, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<DirectoryUser[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      setUsers([]);
      return;
    }
    const unsub = subscribeUsers(setUsers);
    return () => unsub();
  }, [isAuthenticated]);

  const participant = useMemo(
    () => data.participants.find((p) => p.id === id),
    [data.participants, id],
  );

  const linkedUser = useMemo(
    () => users.find((u) => u.participantId === id),
    [users, id],
  );

  const isOwnProfile = !!id && user?.participantId === id;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [id]);

  if (!participant) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-16">
        <EmptyState
          icon={AlertCircle}
          title="Participant not found"
          description="This person may have been removed from the trip."
          action={
            <Link to="/participants">
              <Button>
                <ArrowLeft className="w-4 h-4" /> All participants
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const p = participant;
  const meta = STATUS_META[p.status] ?? STATUS_META.confirmed;
  const StatusIcon = meta.icon;

  // Personal fields: when a signed-in account is linked, the user's
  // self-managed fields take priority. Otherwise fall back to whatever
  // the admin set on the participant record.
  const photoUrl = linkedUser?.photoUrl || p.photoUrl || "";
  const nickname = linkedUser?.nickname || p.nickname || "";
  const contact = linkedUser?.contact || p.contact || "";
  const notes = linkedUser?.notes || p.notes || "";

  const initial = p.name.slice(0, 1).toUpperCase();

  const balances = computeParticipantBalances(
    data.participants,
    data.contributions,
    data.expenses,
  );
  const balance = balances.find((b) => b.participantId === p.id);

  const contribution = data.contributions.find(
    (c) => c.participantId === p.id,
  );

  const plannedAmount = contribution?.plannedAmount ?? 0;
  const actualAmount = contribution?.actualAmount ?? 0;
  const outstanding = Math.max(0, plannedAmount - actualAmount);
  const progressPct =
    plannedAmount > 0 ? Math.min(100, (actualAmount / plannedAmount) * 100) : 0;

  const expensesThisPersonPaid = data.expenses.filter((e) => e.paidBy === p.id);
  const totalPaidDirectly = expensesThisPersonPaid.reduce(
    (s, e) => s + (e.actualAmount || e.amount || 0),
    0,
  );

  return (
    <div className="pb-16">
      {/* COVER */}
      <section className="relative h-56 md:h-64 overflow-hidden">
        <img
          src={COVER_IMG}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-midnight/40 via-midnight/60 to-midnight" />
        <div className="absolute inset-0 bg-gradient-to-r from-midnight/70 via-transparent to-transparent" />

        <div className="absolute top-5 left-4 md:left-6 z-10">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-midnight/60 backdrop-blur-md border border-purpleDark/60 text-textPrimary text-xs hover:bg-midnight/80 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        </div>
      </section>

      {/* PROFILE CARD */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 -mt-20 md:-mt-24 relative z-10">
        <div className="rounded-3xl border border-purpleDark/60 bg-indigoDeep/95 backdrop-blur-xl shadow-soft p-6 md:p-7">
          <div className="flex flex-col md:flex-row md:items-center gap-5">
            <div className="shrink-0 -mt-16 md:-mt-20">
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-indigoDeep overflow-hidden bg-purpleDark/70 flex items-center justify-center shadow-glow">
                {photoUrl ? (
                  <img
                    src={photoUrl}
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
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="font-serif text-2xl md:text-3xl text-textPrimary mb-0.5 truncate">
                {p.name}
              </h1>
              {nickname && (
                <p className="text-textSecondary text-sm">“{nickname}”</p>
              )}
              <div className="flex flex-wrap items-center gap-3 text-xs mt-2">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider ${meta.color}`}
                >
                  <StatusIcon className="w-2.5 h-2.5" />
                  {meta.label}
                </span>
                <span className="inline-flex items-center gap-1.5 text-textSecondary">
                  <UserCircle2 className="w-3.5 h-3.5" />
                  Trip member
                </span>
                {isAdmin && linkedUser && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider bg-forest/15 text-forest border-forest/40"
                    title={linkedUser.email}
                  >
                    <Link2 className="w-2.5 h-2.5" /> Account linked
                  </span>
                )}
              </div>
            </div>

            {isOwnProfile && (
              <div className="shrink-0">
                <Link to="/me">
                  <Button>
                    <UserCircle2 className="w-4 h-4" /> Edit my profile
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {(contact || notes) && (
            <div className="mt-6 pt-6 border-t border-purpleDark/40 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {contact && (
                <div>
                  <p className="text-[11px] text-textSecondary uppercase tracking-wider mb-1">
                    Contact
                  </p>
                  <p className="text-textPrimary inline-flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-textSecondary" />
                    {contact}
                  </p>
                </div>
              )}
              {notes && (
                <div className={contact ? "" : "md:col-span-2"}>
                  <p className="text-[11px] text-textSecondary uppercase tracking-wider mb-1">
                    Notes
                  </p>
                  <p className="text-textPrimary text-xs leading-relaxed">
                    {notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mt-8">
          <StatBox
            label="Contribution"
            value={formatBDT(actualAmount)}
            sub={
              plannedAmount > 0
                ? `of ${formatBDT(plannedAmount)} pledged`
                : "No pledge yet"
            }
            accent="peach"
          />
          <StatBox
            label="Outstanding"
            value={formatBDT(outstanding)}
            sub={outstanding > 0 ? "Still to pay" : "Fully paid"}
            accent={outstanding > 0 ? "coral" : "forest"}
          />
          <StatBox
            label="Expense share"
            value={balance ? formatBDT(balance.owed) : "৳0"}
            sub="Allocated from actual expenses"
            accent="gold"
          />
          <StatBox
            label="Balance"
            value={
              balance?.state === "settled"
                ? "Settled"
                : balance
                ? `${balance.state === "receives" ? "+" : "-"}${formatBDT(
                    Math.abs(balance.net),
                  )}`
                : "—"
            }
            sub={
              balance?.state === "owes"
                ? "Owes the group"
                : balance?.state === "receives"
                ? "Receives from group"
                : "All square"
            }
            accent={
              balance?.state === "owes"
                ? "coral"
                : balance?.state === "receives"
                ? "forest"
                : "muted"
            }
          />
        </div>

        {/* PROGRESS */}
        {plannedAmount > 0 && (
          <section className="mt-6 rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-serif text-lg text-textPrimary flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-peach" />
                Contribution progress
              </h2>
              <span className="text-xs text-textSecondary">
                {Math.round(progressPct)}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-purpleDark/60 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-peach to-coral transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-3 text-xs text-textSecondary">
              <span>{formatBDT(actualAmount)} paid</span>
              <span>{formatBDT(plannedAmount)} pledged</span>
            </div>
          </section>
        )}

        {/* DIRECT PAYMENTS */}
        {expensesThisPersonPaid.length > 0 && (
          <section className="mt-6 rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 overflow-hidden">
            <div className="px-6 py-4 border-b border-purpleDark/60 flex items-center justify-between">
              <h2 className="font-serif text-lg text-textPrimary flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gold" />
                Direct payments
              </h2>
              <span className="text-xs text-textSecondary">
                Total {formatBDT(totalPaidDirectly)}
              </span>
            </div>
            <div className="divide-y divide-purpleDark/40">
              {expensesThisPersonPaid.map((e) => {
                const cat =
                  data.categories.find((c) => c.id === e.categoryId)?.name ??
                  "—";
                return (
                  <div
                    key={e.id}
                    className="px-6 py-3 flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="text-textPrimary truncate">
                        {e.description}
                      </p>
                      <p className="text-[11px] text-textSecondary">
                        {cat} · {e.date}
                      </p>
                    </div>
                    <span className="text-textPrimary font-medium shrink-0">
                      {formatBDT(e.actualAmount || e.amount || 0)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* BADGES (own profile only) */}
        {isOwnProfile && (
          <section className="mt-6">
            <h2 className="font-serif text-lg text-textPrimary mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-peach" />
              Adventure Badges
            </h2>
            <div className="grid grid-cols-3 gap-3 md:gap-4">
              <BadgeCard
                icon={Calendar}
                label="Kanchanjanga Seeker"
                accent="peach"
              />
              <BadgeCard
                icon={MapPin}
                label="Tea Trail Nomad"
                accent="forest"
              />
              <BadgeCard icon={Shield} label="Border Pioneer" accent="gold" />
            </div>
          </section>
        )}

        {/* BACK */}
        <div className="mt-8 flex justify-center">
          <Link to="/participants">
            <Button variant="secondary">
              <ArrowLeft className="w-4 h-4" /> Back to participants
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: "peach" | "coral" | "gold" | "forest" | "muted";
}) {
  const colorMap: Record<string, string> = {
    peach: "text-peach",
    coral: "text-coral",
    gold: "text-gold",
    forest: "text-forest",
    muted: "text-textPrimary",
  };
  return (
    <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-4 pv-card">
      <p className="text-[10px] text-textSecondary uppercase tracking-wider mb-1.5">
        {label}
      </p>
      <p
        className={`text-xl md:text-2xl font-semibold mb-0.5 truncate ${colorMap[accent]}`}
      >
        {value}
      </p>
      {sub && (
        <p className="text-[11px] text-textSecondary truncate">{sub}</p>
      )}
    </div>
  );
}

function BadgeCard({
  icon: Icon,
  label,
  accent,
}: {
  icon: typeof Award;
  label: string;
  accent: "peach" | "forest" | "gold";
}) {
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
  const c = colorMap[accent];
  return (
    <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-4 text-center hover:border-peach/40 transition-colors">
      <div
        className={`w-12 h-12 md:w-14 md:h-14 mx-auto rounded-full ${c.bg} ${c.border} border-2 flex items-center justify-center mb-3`}
      >
        <Icon className={`w-5 h-5 md:w-6 md:h-6 ${c.text}`} />
      </div>
      <p className="text-xs md:text-sm text-textPrimary font-medium leading-tight">
        {label}
      </p>
    </div>
  );
}
