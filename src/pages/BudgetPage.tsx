import { useMemo, useState } from "react";
import {
  Plus,
  Wallet,
  TrendingDown,
  AlertTriangle,
  Trash2,
  Pencil,
  Coins,
  Users,
  ArrowRightLeft,
} from "lucide-react";
import { useStore } from "../lib/store";
import { useAuth } from "../lib/auth";
import { useToast } from "../components/Toast";
import { useConfirm } from "../components/ConfirmProvider";
import { computeTripTotals, computeParticipantBalances } from "../lib/finance";
import { formatBDT } from "../lib/money";
import DonutChart from "../components/DonutChart";
import Modal from "../components/Modal";
import Button from "../components/PrimaryButton";
import AdminOnly from "../components/AdminOnly";
import { Select, TextArea, TextInput } from "../components/FormField";
import EmptyState from "../components/EmptyState";
import { Skeleton, SkeletonTable } from "../components/Skeleton";
import type { AllocationMethod, Expense, ExpenseKind } from "../lib/types";

type Tab = "overview" | "ledger" | "settlement";

export default function BudgetPage() {
  const { data, ready } = useStore();
  const [tab, setTab] = useState<Tab>("overview");
  const totals = useMemo(() => computeTripTotals(data), [data]);

  if (!ready) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 md:py-10">
        <Skeleton className="h-8 w-40 mb-3" />
        <Skeleton className="h-3 w-72 mb-6" />
        <Skeleton className="h-10 w-full max-w-xs mb-6 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
        <SkeletonTable rows={5} />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6 pv-fade-up">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl text-textPrimary mb-1">
            Budget
          </h1>
          <p className="text-textSecondary text-sm">
            Contributions, expenses, and settlement — kept separate and precise.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {(["overview", "ledger", "settlement"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap capitalize transition-colors ${
              tab === t
                ? "bg-peach text-midnight font-medium"
                : "bg-indigoDeep border border-purpleDark/60 text-textSecondary hover:text-textPrimary"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab totals={totals} />}
      {tab === "ledger" && <LedgerTab />}
      {tab === "settlement" && <SettlementTab />}
    </div>
  );
}

function OverviewTab({
  totals,
}: {
  totals: ReturnType<typeof computeTripTotals>;
}) {
  const expenseTotalForDonut = Math.max(
    totals.plannedExpenseTotal,
    totals.actualExpenseTotal,
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-6 pv-card pv-fade-up">
        <h2 className="font-serif text-lg text-textPrimary mb-6">
          Expense breakdown
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col items-center gap-3">
            <DonutChart
              value={totals.plannedExpenseTotal}
              total={expenseTotalForDonut || 1}
              label="Planned"
              amount={formatBDT(totals.plannedExpenseTotal)}
              color="#F2B49E"
            />
            <p className="text-xs text-textSecondary text-center">
              Total estimated budget
            </p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <DonutChart
              value={totals.actualExpenseTotal}
              total={expenseTotalForDonut || 1}
              label="Actual"
              amount={formatBDT(totals.actualExpenseTotal)}
              color="#F28B83"
            />
            <p className="text-xs text-textSecondary text-center">
              Money actually spent
            </p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <DonutChart
              value={Math.max(0, totals.groupCashBalance)}
              total={Math.max(totals.actualContributions, 1)}
              label="Cash"
              amount={formatBDT(totals.groupCashBalance)}
              color="#F2C879"
            />
            <p className="text-xs text-textSecondary text-center">
              Available in the pool
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Planned budget"
          value={formatBDT(totals.plannedExpenseTotal)}
          icon={Coins}
          accent="peach"
        />
        <MetricCard
          label="Actual spent"
          value={formatBDT(totals.actualExpenseTotal)}
          icon={TrendingDown}
          accent="coral"
        />
        <MetricCard
          label="Contributions"
          value={formatBDT(totals.actualContributions)}
          sublabel={`of ${formatBDT(totals.plannedContributions)} planned`}
          icon={Wallet}
          accent="gold"
        />
        <MetricCard
          label="Outstanding"
          value={formatBDT(totals.outstandingContributions)}
          sublabel="from participants"
          icon={AlertTriangle}
          accent={totals.outstandingContributions > 0 ? "coral" : "forest"}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-5 pv-card">
          <p className="text-xs text-textSecondary mb-2">Emergency reserve</p>
          <div className="space-y-2 text-sm">
            <Row
              label="Target"
              value={formatBDT(totals.emergencyReserveTarget)}
            />
            <Row
              label="Funded"
              value={formatBDT(totals.emergencyReserveFunded)}
            />
            <Row
              label="Remaining"
              value={formatBDT(totals.emergencyReserveRemaining)}
            />
          </div>
          <p className="text-[11px] text-lavenderMist mt-3">
            Adjust the reserve from Admin → Trip settings.
          </p>
        </div>

        <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-5 pv-card">
          <p className="text-xs text-textSecondary mb-2">Per-person estimate</p>
          <p className="text-2xl font-semibold text-peach mb-2">
            {formatBDT(totals.estimatedPerPersonCost)}
          </p>
          <p className="text-xs text-textSecondary">
            Based on {totals.confirmedParticipantCount} confirmed{" "}
            {totals.confirmedParticipantCount === 1 ? "traveler" : "travelers"}
          </p>
        </div>

        <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-5 pv-card">
          <p className="text-xs text-textSecondary mb-2">Budget variance</p>
          <p
            className={`text-2xl font-semibold mb-2 ${
              totals.budgetVariance >= 0 ? "text-forest" : "text-coral"
            }`}
          >
            {formatBDT(totals.budgetVariance)}
          </p>
          <p className="text-xs text-textSecondary">
            {totals.budgetVariance >= 0 ? "Under budget" : "Over budget"}
          </p>
        </div>
      </div>

      <CategoryBreakdown />

      {totals.actualContributions > 0 && totals.groupCashBalance < 0 && (
        <div className="rounded-2xl border border-coral/40 bg-coral/10 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-coral shrink-0 mt-0.5" />
          <div className="text-sm text-textPrimary">
            The group pool is overdrawn. Some expenses may have been paid
            outside the pool, or contributions need to be added.
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryBreakdown() {
  const { data } = useStore();

  const rows = useMemo(() => {
    const map = new Map<string, { planned: number; actual: number }>();
    for (const c of data.categories) map.set(c.id, { planned: 0, actual: 0 });
    for (const e of data.expenses) {
      const rec = map.get(e.categoryId) ?? { planned: 0, actual: 0 };
      if (e.kind === "planned") rec.planned += e.plannedAmount || e.amount;
      if (e.kind === "actual") rec.actual += e.actualAmount || e.amount;
      map.set(e.categoryId, rec);
    }
    return data.categories
      .filter((c) => c.active)
      .sort((a, b) => a.order - b.order)
      .map((c) => ({
        id: c.id,
        name: c.name,
        planned: map.get(c.id)?.planned ?? 0,
        actual: map.get(c.id)?.actual ?? 0,
      }));
  }, [data.categories, data.expenses]);

  const maxVal = Math.max(1, ...rows.map((r) => Math.max(r.planned, r.actual)));

  if (rows.length === 0) return null;

  return (
    <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-6 pv-card">
      <h2 className="font-serif text-lg text-textPrimary mb-5">
        Category breakdown
      </h2>
      <div className="space-y-4">
        {rows.map((r) => (
          <div key={r.id}>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-textPrimary">{r.name}</span>
              <span className="text-textSecondary text-xs">
                {formatBDT(r.actual)} / {formatBDT(r.planned)}
              </span>
            </div>
            <div className="flex gap-1 h-2">
              <div
                className="rounded-full bg-peach/70 transition-all duration-700"
                style={{ width: `${(r.planned / maxVal) * 100}%` }}
              />
            </div>
            <div className="flex gap-1 h-2 mt-1">
              <div
                className="rounded-full bg-coral/70 transition-all duration-700"
                style={{ width: `${(r.actual / maxVal) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-5 text-[11px] text-textSecondary">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-1.5 rounded-full bg-peach/70" /> Planned
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-1.5 rounded-full bg-coral/70" /> Actual
        </span>
      </div>
    </div>
  );
}

function LedgerTab() {
  const { data, addExpense, updateExpense, removeExpense } = useStore();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const sorted = useMemo(
    () =>
      [...data.expenses].sort((a, b) =>
        (b.date || "").localeCompare(a.date || ""),
      ),
    [data.expenses],
  );

  const handleDelete = async (e: Expense) => {
    const ok = await confirm({
      title: `Delete "${e.description}"?`,
      message: "This expense will be permanently removed.",
      confirmText: "Delete",
      danger: true,
    });
    if (ok) {
      removeExpense(e.id);
      toast.success("Expense deleted", "Removed");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-textSecondary">
          {data.expenses.length}{" "}
          {data.expenses.length === 1 ? "expense" : "expenses"} recorded
        </p>
        <AdminOnly>
          <Button onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4" /> Add Expense
          </Button>
        </AdminOnly>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Coins}
          title="No expenses yet"
          description={
            isAdmin
              ? "Add planned expenses first to build a budget. Update them to actual once paid."
              : "The organizer hasn't recorded expenses yet."
          }
          action={
            isAdmin ? (
              <Button onClick={() => setCreating(true)}>
                <Plus className="w-4 h-4" /> Add Expense
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-3 border-b border-purpleDark/60 text-[11px] uppercase tracking-wider text-textSecondary">
            <div className="col-span-4">Description</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-1">Kind</div>
            <div className="col-span-2 text-right">Planned</div>
            <div className="col-span-2 text-right">Actual</div>
            {isAdmin && <div className="col-span-1 text-right">Actions</div>}
          </div>
          <div className="divide-y divide-purpleDark/40">
            {sorted.map((e, i) => (
              <ExpenseRow
                key={e.id}
                expense={e}
                canEdit={isAdmin}
                index={i}
                categoryName={
                  data.categories.find((c) => c.id === e.categoryId)?.name ??
                  "—"
                }
                onEdit={() => setEditing(e)}
                onRemove={() => handleDelete(e)}
              />
            ))}
          </div>
        </div>
      )}

      <AdminOnly>
        <>
          <ExpenseModal
            open={creating}
            onClose={() => setCreating(false)}
            onSave={(payload) => {
              addExpense(payload);
              setCreating(false);
              toast.success("Expense added", "Saved");
            }}
          />
          <ExpenseModal
            open={editing !== null}
            onClose={() => setEditing(null)}
            initial={editing ?? undefined}
            onSave={(payload) => {
              if (editing) updateExpense(editing.id, payload);
              setEditing(null);
              toast.success("Expense updated", "Saved");
            }}
          />
        </>
      </AdminOnly>
    </div>
  );
}

function ExpenseRow({
  expense,
  canEdit,
  index,
  categoryName,
  onEdit,
  onRemove,
}: {
  expense: Expense;
  canEdit: boolean;
  index: number;
  categoryName: string;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const planned = expense.plannedAmount || expense.amount;
  const actual = expense.actualAmount || 0;
  return (
    <div
      className={`grid grid-cols-2 ${
        canEdit ? "md:grid-cols-12" : "md:grid-cols-11"
      } gap-3 px-5 py-4 items-center hover:bg-purpleDark/20 transition-colors pv-fade-up`}
      style={{ animationDelay: `${Math.min(index * 0.03, 0.3)}s` }}
    >
      <div className="col-span-2 md:col-span-4 min-w-0">
        <p className="text-sm text-textPrimary truncate">
          {expense.description}
        </p>
        <p className="text-[11px] text-textSecondary">{expense.date}</p>
      </div>
      <div className="md:col-span-2 text-xs text-textSecondary truncate">
        {categoryName}
      </div>
      <div className="md:col-span-1">
        <span
          className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${
            expense.kind === "actual"
              ? "bg-forest/20 text-forest border-forest/40"
              : "bg-purpleDark/50 text-textSecondary border-purpleDark"
          }`}
        >
          {expense.kind}
        </span>
      </div>
      <div className="md:col-span-2 text-sm text-textSecondary md:text-right">
        {formatBDT(planned)}
      </div>
      <div className="md:col-span-2 text-sm text-textPrimary md:text-right font-medium">
        {expense.kind === "actual" ? formatBDT(actual) : "—"}
      </div>
      {canEdit && (
        <div className="col-span-2 md:col-span-1 flex md:justify-end gap-1">
          <button
            onClick={onEdit}
            className="p-1.5 rounded hover:bg-purpleDark/60 text-textSecondary"
            aria-label="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRemove}
            className="p-1.5 rounded hover:bg-coral/20 text-coral"
            aria-label="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function SettlementTab() {
  const { data } = useStore();

  const balances = useMemo(
    () =>
      computeParticipantBalances(
        data.participants,
        data.contributions,
        data.expenses,
      ),
    [data.participants, data.contributions, data.expenses],
  );

  if (data.participants.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No participants yet"
        description="Add participants first to see settlement balances."
      />
    );
  }

  const hasActual = data.expenses.some((e) => e.kind === "actual");

  return (
    <div className="space-y-5">
      {!hasActual && (
        <div className="rounded-2xl border border-peach/30 bg-peach/5 p-4 text-sm text-textSecondary">
          Settlement only reflects <span className="text-peach">actual</span>{" "}
          expenses. Add actual expenses to see real balances.
        </div>
      )}

      <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-3 border-b border-purpleDark/60 text-[11px] uppercase tracking-wider text-textSecondary">
          <div className="col-span-4">Participant</div>
          <div className="col-span-2 text-right">Contributed</div>
          <div className="col-span-2 text-right">Paid directly</div>
          <div className="col-span-2 text-right">Owed</div>
          <div className="col-span-2 text-right">Balance</div>
        </div>
        <div className="divide-y divide-purpleDark/40">
          {balances.map((b, i) => (
            <div
              key={b.participantId}
              className="grid grid-cols-2 md:grid-cols-12 gap-3 px-5 py-4 items-center pv-fade-up"
              style={{ animationDelay: `${Math.min(i * 0.04, 0.3)}s` }}
            >
              <div className="col-span-2 md:col-span-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purpleDark/60 flex items-center justify-center text-xs text-peach font-medium">
                  {b.name.slice(0, 1).toUpperCase()}
                </div>
                <span className="text-sm text-textPrimary truncate">
                  {b.name}
                </span>
              </div>
              <div className="md:col-span-2 text-xs text-textSecondary md:text-right">
                {formatBDT(b.contributed)}
              </div>
              <div className="md:col-span-2 text-xs text-textSecondary md:text-right">
                {formatBDT(b.paidDirectly)}
              </div>
              <div className="md:col-span-2 text-xs text-textSecondary md:text-right">
                {formatBDT(b.owed)}
              </div>
              <div className="col-span-2 md:col-span-2 md:text-right">
                <span
                  className={`text-sm font-semibold ${
                    b.state === "receives"
                      ? "text-forest"
                      : b.state === "owes"
                        ? "text-coral"
                        : "text-textSecondary"
                  }`}
                >
                  {b.state === "settled"
                    ? "Settled"
                    : `${b.state === "receives" ? "+" : "-"}${formatBDT(
                        Math.abs(b.net),
                      )}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sublabel,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sublabel?: string;
  icon: typeof Coins;
  accent: "peach" | "coral" | "gold" | "forest";
}) {
  const colors: Record<string, string> = {
    peach: "text-peach",
    coral: "text-coral",
    gold: "text-gold",
    forest: "text-forest",
  };
  return (
    <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-5 pv-card">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-textSecondary">{label}</p>
        <Icon className={`w-4 h-4 ${colors[accent]}`} />
      </div>
      <p className="text-xl md:text-2xl font-semibold text-textPrimary mb-1">
        {value}
      </p>
      {sublabel && <p className="text-[11px] text-textSecondary">{sublabel}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-textSecondary text-xs">{label}</span>
      <span className="text-textPrimary text-sm">{value}</span>
    </div>
  );
}

interface ExpensePayload {
  description: string;
  categoryId: string;
  kind: ExpenseKind;
  amount: number;
  plannedAmount: number;
  actualAmount: number;
  status: "unpaid" | "partial" | "paid";
  date: string;
  paidBy: string;
  allocationMethod: AllocationMethod;
  eligibleParticipantIds: string[];
  notes: string;
}

function ExpenseModal({
  open,
  onClose,
  initial,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Expense;
  onSave: (payload: ExpensePayload) => void;
}) {
  const { data } = useStore();
  const activeCategories = data.categories
    .filter((c) => c.active)
    .sort((a, b) => a.order - b.order);

  const [description, setDescription] = useState(initial?.description ?? "");
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? activeCategories[0]?.id ?? "",
  );
  const [kind, setKind] = useState<ExpenseKind>(initial?.kind ?? "planned");
  const [plannedAmount, setPlannedAmount] = useState(
    initial?.plannedAmount ?? 0,
  );
  const [actualAmount, setActualAmount] = useState(initial?.actualAmount ?? 0);
  const [status, setStatus] = useState<ExpensePayload["status"]>(
    initial?.status ?? "unpaid",
  );
  const [date, setDate] = useState(
    initial?.date ?? new Date().toISOString().slice(0, 10),
  );
  const [paidBy, setPaidBy] = useState<string>(initial?.paidBy ?? "pool");
  const [allocationMethod, setAllocationMethod] = useState<AllocationMethod>(
    initial?.allocationMethod ?? "equal",
  );
  const [eligibleIds, setEligibleIds] = useState<string[]>(
    initial?.eligibleParticipantIds ?? [],
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const [lastId, setLastId] = useState<string | null>(initial?.id ?? null);
  if (open && (initial?.id ?? null) !== lastId) {
    setLastId(initial?.id ?? null);
    setDescription(initial?.description ?? "");
    setCategoryId(initial?.categoryId ?? activeCategories[0]?.id ?? "");
    setKind(initial?.kind ?? "planned");
    setPlannedAmount(initial?.plannedAmount ?? 0);
    setActualAmount(initial?.actualAmount ?? 0);
    setStatus(initial?.status ?? "unpaid");
    setDate(initial?.date ?? new Date().toISOString().slice(0, 10));
    setPaidBy(initial?.paidBy ?? "pool");
    setAllocationMethod(initial?.allocationMethod ?? "equal");
    setEligibleIds(initial?.eligibleParticipantIds ?? []);
    setNotes(initial?.notes ?? "");
  }

  const amount = kind === "actual" ? actualAmount : plannedAmount;
  const canSave =
    description.trim().length > 0 &&
    categoryId.length > 0 &&
    Number.isFinite(amount);

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      description: description.trim(),
      categoryId,
      kind,
      amount,
      plannedAmount,
      actualAmount,
      status,
      date,
      paidBy,
      allocationMethod,
      eligibleParticipantIds: eligibleIds,
      notes,
    });
  };

  const toggleEligible = (id: string) => {
    setEligibleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Edit Expense" : "New Expense"}
      width="lg"
    >
      <div className="space-y-4">
        <TextInput
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Outbound train tickets"
          autoFocus
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select
            label="Category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            {activeCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <TextInput
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select
            label="Kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as ExpenseKind)}
          >
            <option value="planned">Planned (estimate)</option>
            <option value="actual">Actual (confirmed)</option>
          </Select>
          <TextInput
            label="Planned amount (৳)"
            type="number"
            min={0}
            value={plannedAmount}
            onChange={(e) => setPlannedAmount(Number(e.target.value) || 0)}
          />
          <TextInput
            label="Actual amount (৳)"
            type="number"
            min={0}
            value={actualAmount}
            onChange={(e) => setActualAmount(Number(e.target.value) || 0)}
            disabled={kind === "planned"}
            hint={
              kind === "planned"
                ? "Set kind to Actual to record this"
                : undefined
            }
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select
            label="Paid by"
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
          >
            <option value="pool">Group pool</option>
            {data.participants
              .filter((p) => p.status !== "cancelled")
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </Select>
          <Select
            label="Allocation"
            value={allocationMethod}
            onChange={(e) =>
              setAllocationMethod(e.target.value as AllocationMethod)
            }
          >
            <option value="equal">Equal split</option>
            <option value="selected">Selected participants</option>
            <option value="weighted">Weighted (custom shares)</option>
          </Select>
          <Select
            label="Status"
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as ExpensePayload["status"])
            }
          >
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </Select>
        </div>

        {(allocationMethod === "selected" ||
          allocationMethod === "weighted") && (
          <div>
            <p className="text-xs text-textSecondary mb-2">
              {allocationMethod === "selected"
                ? "Which participants share this?"
                : "Participants included (weights not editable yet — treated equally)"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {data.participants
                .filter((p) => p.status !== "cancelled")
                .map((p) => {
                  const checked = eligibleIds.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm ${
                        checked
                          ? "border-peach/60 bg-peach/10 text-textPrimary"
                          : "border-purpleDark/60 bg-midnight/40 text-textSecondary"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleEligible(p.id)}
                        className="accent-peach"
                      />
                      <span className="truncate">{p.name}</span>
                    </label>
                  );
                })}
            </div>
            {eligibleIds.length === 0 && (
              <p className="text-[11px] text-coral mt-2">
                No participants selected — leave unchecked to include all
                confirmed travelers automatically.
              </p>
            )}
          </div>
        )}

        <TextArea
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Receipt reference, vendor, or reminder…"
        />

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            onClick={onClose}
            className="text-sm text-textSecondary hover:text-textPrimary"
          >
            Cancel
          </button>
          <Button onClick={handleSave} disabled={!canSave}>
            <ArrowRightLeft className="w-4 h-4" />
            {initial ? "Save changes" : "Add expense"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
