// ============================================================================
// Financial Calculation Engine — single source of truth for all money math.
// All functions are pure and take the raw data as arguments. Do not duplicate
// these calculations anywhere else in the application.
// ============================================================================

import type { AppData, Contribution, Expense, ID, Participant } from "./types";
import { splitEvenly, splitWeighted, toInt } from "./money";

// ---------------------------------------------------------------------------
// Expense allocation
// ---------------------------------------------------------------------------

export interface AllocationResult {
  /** participantId -> share in ৳ */
  shares: Record<ID, number>;
  total: number;
  method: Expense["allocationMethod"];
  eligibleIds: ID[];
  warning: string | null;
}

/**
 * Determine which participants are eligible for an expense. If the expense
 * lists explicit eligibleParticipantIds, only those are used. Otherwise, all
 * participants with status "confirmed" are eligible.
 */
export function getEligibleParticipants(
  expense: Expense,
  participants: Participant[],
): Participant[] {
  const active = participants.filter((p) => p.status !== "cancelled");
  if (expense.eligibleParticipantIds.length === 0) {
    return active.filter((p) => p.status === "confirmed");
  }
  const set = new Set(expense.eligibleParticipantIds);
  return active.filter((p) => set.has(p.id));
}

/**
 * Calculate the per-participant shares of an expense.
 */
export function allocateExpense(
  expense: Expense,
  participants: Participant[],
): AllocationResult {
  const eligible = getEligibleParticipants(expense, participants);
  const eligibleIds = eligible.map((p) => p.id);
  const total = toInt(
    expense.kind === "actual" && expense.actualAmount > 0
      ? expense.actualAmount
      : expense.amount,
  );

  if (eligibleIds.length === 0) {
    return {
      shares: {},
      total,
      method: expense.allocationMethod,
      eligibleIds: [],
      warning:
        "No eligible participants. Please select participants for this expense.",
    };
  }

  if (total <= 0) {
    return {
      shares: Object.fromEntries(eligibleIds.map((id) => [id, 0])),
      total: 0,
      method: expense.allocationMethod,
      eligibleIds,
      warning: null,
    };
  }

  let amounts: number[];
  if (expense.allocationMethod === "weighted") {
    const weights = eligibleIds.map((id) =>
      Math.max(0, expense.weights[id] ?? 0),
    );
    const anyWeight = weights.some((w) => w > 0);
    amounts = anyWeight
      ? splitWeighted(total, weights)
      : splitEvenly(total, eligibleIds.length);
  } else {
    // "equal" and "selected" both use an even split of the selected set.
    amounts = splitEvenly(total, eligibleIds.length);
  }

  const shares: Record<ID, number> = {};
  eligibleIds.forEach((id, i) => {
    shares[id] = amounts[i];
  });

  return {
    shares,
    total,
    method: expense.allocationMethod,
    eligibleIds,
    warning: null,
  };
}

// ---------------------------------------------------------------------------
// Trip totals
// ---------------------------------------------------------------------------

export interface TripTotals {
  // Contributions
  plannedContributions: number;
  actualContributions: number;
  outstandingContributions: number;

  // Expenses (never double-counted: planned rows are separate from actual rows)
  plannedExpenseTotal: number;
  actualExpenseTotal: number;
  budgetVariance: number; // planned - actual

  // Cash pool
  groupCashBalance: number; // actualContributions - pool-paid actual expenses

  // Emergency reserve
  emergencyReserveTarget: number;
  emergencyReserveFunded: number;
  emergencyReserveSpent: number;
  emergencyReserveRemaining: number;

  // Per-person
  estimatedPerPersonCost: number;
  actualPerPersonCost: number;

  // Counts
  confirmedParticipantCount: number;
  activeParticipantCount: number;
}

/**
 * Compute aggregate trip totals.
 */
export function computeTripTotals(
  data: Pick<AppData, "trip" | "participants" | "contributions" | "expenses">,
): TripTotals {
  const { trip, participants, contributions, expenses } = data;

  const active = participants.filter((p) => p.status !== "cancelled");
  const confirmed = participants.filter((p) => p.status === "confirmed");

  const plannedContributions = contributions.reduce(
    (s, c) => s + toInt(c.plannedAmount),
    0,
  );
  const actualContributions = contributions.reduce(
    (s, c) => s + toInt(c.actualAmount),
    0,
  );

  const plannedExpenseTotal = expenses
    .filter((e) => e.kind === "planned")
    .reduce((s, e) => s + toInt(e.plannedAmount || e.amount), 0);

  const actualExpenseTotal = expenses
    .filter((e) => e.kind === "actual")
    .reduce((s, e) => s + toInt(e.actualAmount || e.amount), 0);

  // Cash pool = contributions received minus expenses paid FROM the pool.
  const poolPaidExpenses = expenses
    .filter((e) => e.kind === "actual" && e.paidBy === "pool")
    .reduce((s, e) => s + toInt(e.actualAmount || e.amount), 0);

  const groupCashBalance = actualContributions - poolPaidExpenses;

  // Emergency reserve target
  let emergencyReserveTarget = 0;
  if (trip.emergencyReserveMode === "fixed") {
    emergencyReserveTarget = toInt(trip.emergencyReserveValue);
  } else {
    const pct = Math.max(0, Math.min(100, trip.emergencyReserveValue)) / 100;
    emergencyReserveTarget = Math.round(plannedExpenseTotal * pct);
  }

  const reserveFunded = Math.min(actualContributions, emergencyReserveTarget);
  const reserveSpent = 0; // counted separately once a real reserve expense is recorded
  const reserveRemaining = Math.max(0, reserveFunded - reserveSpent);

  const estimatedPerPersonCost =
    confirmed.length > 0
      ? Math.round(plannedExpenseTotal / confirmed.length)
      : 0;
  const actualPerPersonCost =
    confirmed.length > 0
      ? Math.round(actualExpenseTotal / confirmed.length)
      : 0;

  return {
    plannedContributions,
    actualContributions,
    outstandingContributions: Math.max(
      0,
      plannedContributions - actualContributions,
    ),
    plannedExpenseTotal,
    actualExpenseTotal,
    budgetVariance: plannedExpenseTotal - actualExpenseTotal,
    groupCashBalance,
    emergencyReserveTarget,
    emergencyReserveFunded: reserveFunded,
    emergencyReserveSpent: reserveSpent,
    emergencyReserveRemaining: reserveRemaining,
    estimatedPerPersonCost,
    actualPerPersonCost,
    confirmedParticipantCount: confirmed.length,
    activeParticipantCount: active.length,
  };
}

// ---------------------------------------------------------------------------
// Participant settlement
// ---------------------------------------------------------------------------

export interface ParticipantBalance {
  participantId: ID;
  name: string;
  /** Cash contributed to the pool. */
  contributed: number;
  /** Cash paid directly for group expenses (not from the pool). */
  paidDirectly: number;
  /** Share of all ACTUAL expenses allocated to this participant. */
  owed: number;
  /** contributed + paidDirectly - owed */
  net: number;
  /** "owes" if net < 0, "receives" if net > 0, "settled" if net === 0 */
  state: "owes" | "receives" | "settled";
  /** Per-expense allocation breakdown (expenseId -> share in ৳). */
  allocations: Record<ID, number>;
}

/**
 * Compute per-participant settlement balances based on actual expenses.
 * Only actual expenses affect settlement.
 */
export function computeParticipantBalances(
  participants: Participant[],
  contributions: Contribution[],
  expenses: Expense[],
): ParticipantBalance[] {
  const active = participants.filter((p) => p.status !== "cancelled");

  const balances: Record<ID, ParticipantBalance> = {};
  for (const p of active) {
    balances[p.id] = {
      participantId: p.id,
      name: p.name,
      contributed: 0,
      paidDirectly: 0,
      owed: 0,
      net: 0,
      state: "settled",
      allocations: {},
    };
  }

  // Contributions
  for (const c of contributions) {
    if (!balances[c.participantId]) continue;
    balances[c.participantId].contributed += toInt(c.actualAmount);
  }

  // Expenses (actual only)
  const actualExpenses = expenses.filter((e) => e.kind === "actual");
  for (const e of actualExpenses) {
    // Direct payment
    if (e.paidBy !== "pool" && balances[e.paidBy]) {
      balances[e.paidBy].paidDirectly += toInt(e.actualAmount || e.amount);
    }
    // Allocations
    const alloc = allocateExpense(e, active);
    for (const [pid, share] of Object.entries(alloc.shares)) {
      if (!balances[pid]) continue;
      balances[pid].owed += share;
      balances[pid].allocations[e.id] =
        (balances[pid].allocations[e.id] ?? 0) + share;
    }
  }

  // Net & state
  for (const p of active) {
    const b = balances[p.id];
    b.net = b.contributed + b.paidDirectly - b.owed;
    b.state = b.net > 0 ? "receives" : b.net < 0 ? "owes" : "settled";
  }

  return active.map((p) => balances[p.id]);
}

// ---------------------------------------------------------------------------
// Reconciliation
// ---------------------------------------------------------------------------

/**
 * The sum of all participant net balances should be zero when all actual
 * expenses are fully allocated and no external money is in play. This helper
 * verifies that invariant and returns the drift (should be 0).
 */
export function settlementDrift(balances: ParticipantBalance[]): number {
  return balances.reduce((s, b) => s + b.net, 0);
}
