import { useMemo } from "react";
import {
  UserCircle,
  Users,
  MapPin,
  Compass,
  Wallet,
  TrendingUp,
  CheckCircle2,
  Clock,
  Calendar,
  Activity,
  Award,
} from "lucide-react";
import { useStore } from "../lib/store";
import { computeTripTotals, computeParticipantBalances } from "../lib/finance";
import { formatBDT } from "../lib/money";
import EmptyState from "../components/EmptyState";
import DonutChart from "../components/DonutChart";

export default function ProfilePage() {
  const { data } = useStore();

  const totals = useMemo(() => computeTripTotals(data), [data]);
  const balances = useMemo(
    () =>
      computeParticipantBalances(
        data.participants,
        data.contributions,
        data.expenses,
      ),
    [data.participants, data.contributions, data.expenses],
  );

  const completed = data.activities.filter(
    (a) => a.status === "completed",
  ).length;
  const total = data.activities.length;
  const completion = total === 0 ? 0 : Math.round((completed / total) * 100);

  const destinationsVisited = data.destinations.filter(
    (d) => d.priority === "must" || d.priority === "high",
  ).length;

  const tripDays = useMemo(() => {
    if (!data.trip.startDate || !data.trip.endDate) return null;
    const s = new Date(data.trip.startDate).getTime();
    const e = new Date(data.trip.endDate).getTime();
    if (!Number.isFinite(s) || !Number.isFinite(e)) return null;
    const days = Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);
    return days;
  }, [data.trip.startDate, data.trip.endDate]);

  const topContributors = useMemo(
    () =>
      [...balances]
        .sort(
          (a, b) =>
            b.contributed + b.paidDirectly - (a.contributed + a.paidDirectly),
        )
        .slice(0, 5),
    [balances],
  );

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 md:py-10">
      <div className="mb-6">
        <h1 className="font-serif text-3xl md:text-4xl text-textPrimary mb-1">
          Profile & Stats
        </h1>
        <p className="text-textSecondary text-sm">
          A snapshot of the trip based on real data.
        </p>
      </div>

      {/* Trip header card */}
      <div className="rounded-2xl border border-purpleDark/60 bg-gradient-to-br from-indigoDeep via-indigoDeep to-purpleDark/30 p-6 md:p-8 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-peach/15 border border-peach/30 flex items-center justify-center">
              <Compass className="w-8 h-8 text-peach" />
            </div>
            <div>
              <h2 className="font-serif text-2xl text-textPrimary">
                {data.trip.name}
              </h2>
              <p className="text-textSecondary text-xs mt-1">
                {data.trip.startDate
                  ? `${data.trip.startDate}${
                      data.trip.endDate ? ` → ${data.trip.endDate}` : ""
                    }`
                  : "Dates not set"}
                {" · "}
                <span className="capitalize">{data.trip.status}</span>
                {tripDays !== null &&
                  ` · ${tripDays} day${tripDays === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-textSecondary">
              Confirmed travelers
            </p>
            <p className="font-serif text-3xl text-peach">
              {totals.confirmedParticipantCount}
            </p>
          </div>
        </div>
      </div>

      {/* Top metric grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard
          icon={Users}
          label="Participants"
          value={String(data.participants.length)}
          sub={`${totals.confirmedParticipantCount} confirmed`}
          accent="peach"
        />
        <MetricCard
          icon={MapPin}
          label="Destinations"
          value={String(data.destinations.length)}
          sub={`${destinationsVisited} priority`}
          accent="coral"
        />
        <MetricCard
          icon={Activity}
          label="Activities"
          value={String(total)}
          sub={`${completed} completed`}
          accent="gold"
        />
        <MetricCard
          icon={Wallet}
          label="Planned budget"
          value={formatBDT(totals.plannedExpenseTotal)}
          sub={`Actual ${formatBDT(totals.actualExpenseTotal)}`}
          accent="forest"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Completion donut */}
        <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-6">
          <h3 className="font-serif text-lg text-textPrimary mb-5">
            Trip completion
          </h3>
          <div className="flex flex-col items-center gap-4">
            <DonutChart
              value={completion}
              total={100}
              label="Done"
              amount={`${completion}%`}
              color="#F2B879"
            />
            <p className="text-xs text-textSecondary text-center">
              {completed} of {total} activities completed
            </p>
          </div>
        </div>

        {/* Budget donut */}
        <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-6">
          <h3 className="font-serif text-lg text-textPrimary mb-5">
            Budget health
          </h3>
          <div className="flex flex-col items-center gap-4">
            <DonutChart
              value={totals.actualExpenseTotal}
              total={Math.max(totals.plannedExpenseTotal, 1)}
              label="Spent"
              amount={formatBDT(totals.actualExpenseTotal)}
              color="#F28B83"
            />
            <p className="text-xs text-textSecondary text-center">
              vs. planned {formatBDT(totals.plannedExpenseTotal)}
            </p>
          </div>
        </div>

        {/* Contributions donut */}
        <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-6">
          <h3 className="font-serif text-lg text-textPrimary mb-5">
            Contributions received
          </h3>
          <div className="flex flex-col items-center gap-4">
            <DonutChart
              value={totals.actualContributions}
              total={Math.max(totals.plannedContributions, 1)}
              label="Received"
              amount={formatBDT(totals.actualContributions)}
              color="#F2B49E"
            />
            <p className="text-xs text-textSecondary text-center">
              of {formatBDT(totals.plannedContributions)} planned
            </p>
          </div>
        </div>
      </div>

      {/* Top contributors + activity breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Award className="w-4 h-4 text-gold" />
            <h3 className="font-serif text-lg text-textPrimary">
              Top contributors
            </h3>
          </div>
          {topContributors.length === 0 ? (
            <p className="text-sm text-textSecondary">
              No participants yet. Add travelers from the Participants page.
            </p>
          ) : (
            <div className="space-y-3">
              {topContributors.map((b, i) => {
                const total = b.contributed + b.paidDirectly;
                return (
                  <div
                    key={b.participantId}
                    className="flex items-center gap-3"
                  >
                    <div className="w-7 h-7 rounded-full bg-purpleDark/60 flex items-center justify-center text-[11px] text-peach font-semibold shrink-0">
                      {i + 1}
                    </div>
                    <div className="w-9 h-9 rounded-full bg-purpleDark/60 flex items-center justify-center text-xs text-peach shrink-0">
                      {b.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-textPrimary truncate">
                        {b.name}
                      </p>
                      <p className="text-[11px] text-textSecondary">
                        {formatBDT(b.contributed)} contributed
                        {b.paidDirectly > 0 &&
                          ` · ${formatBDT(b.paidDirectly)} direct`}
                      </p>
                    </div>
                    <span className="text-sm text-peach font-medium shrink-0">
                      {formatBDT(total)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-peach" />
            <h3 className="font-serif text-lg text-textPrimary">
              Activity status
            </h3>
          </div>
          {total === 0 ? (
            <p className="text-sm text-textSecondary">
              No activities planned yet.
            </p>
          ) : (
            <div className="space-y-3">
              {(
                [
                  {
                    key: "completed",
                    label: "Completed",
                    Icon: CheckCircle2,
                    color: "text-forest",
                  },
                  {
                    key: "in-progress",
                    label: "In progress",
                    Icon: Clock,
                    color: "text-gold",
                  },
                  {
                    key: "planned",
                    label: "Planned",
                    Icon: Calendar,
                    color: "text-peach",
                  },
                  {
                    key: "skipped",
                    label: "Skipped",
                    Icon: Compass,
                    color: "text-coral",
                  },
                ] as const
              ).map(({ key, label, Icon, color }) => {
                const count = data.activities.filter(
                  (a) => a.status === key,
                ).length;
                const pct = total === 0 ? 0 : (count / total) * 100;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="inline-flex items-center gap-1.5 text-textPrimary">
                        <Icon className={`w-3.5 h-3.5 ${color}`} />
                        {label}
                      </span>
                      <span className="text-textSecondary text-xs">
                        {count}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-purpleDark/40 overflow-hidden">
                      <div
                        className={`h-full ${
                          key === "completed"
                            ? "bg-forest"
                            : key === "in-progress"
                              ? "bg-gold"
                              : key === "planned"
                                ? "bg-peach"
                                : "bg-coral"
                        } transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Empty state if nothing at all */}
      {data.participants.length === 0 &&
        data.expenses.length === 0 &&
        data.activities.length === 0 && (
          <div className="mt-8">
            <EmptyState
              icon={UserCircle}
              title="Start planning to see stats"
              description="Add participants, expenses, and activities — this page will update automatically with real numbers."
            />
          </div>
        )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  sub?: string;
  accent: "peach" | "coral" | "gold" | "forest";
}) {
  const colors: Record<string, string> = {
    peach: "text-peach",
    coral: "text-coral",
    gold: "text-gold",
    forest: "text-forest",
  };
  return (
    <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] text-textSecondary uppercase tracking-wider">
          {label}
        </p>
        <Icon className={`w-4 h-4 ${colors[accent]}`} />
      </div>
      <p className="text-xl md:text-2xl font-semibold text-textPrimary truncate">
        {value}
      </p>
      {sub && (
        <p className="text-[11px] text-textSecondary mt-1 truncate">{sub}</p>
      )}
    </div>
  );
}
