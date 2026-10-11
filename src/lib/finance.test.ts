// Browser-runnable self-tests for the finance engine.
// Call runFinanceTests() from anywhere to see results in the console.

import {
  allocateExpense,
  computeParticipantBalances,
  computeTripTotals,
} from "./finance";
import { splitEvenly } from "./money";
import type { Contribution, Expense, Participant, Trip } from "./types";

function assertEqual(
  actual: unknown,
  expected: unknown,
  label: string,
  errors: string[],
) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) errors.push(`FAIL ${label}: got ${a}, expected ${e}`);
  else console.log(`PASS ${label}`);
}

function makeParticipants(
  ids: string[],
  status: Participant["status"] = "confirmed",
): Participant[] {
  const now = new Date().toISOString();
  return ids.map((id) => ({
    id,
    name: id,
    nickname: "",
    photoUrl: "",
    contact: "",
    status,
    notes: "",
    createdAt: now,
    updatedAt: now,
  }));
}

function makeExpense(partial: Partial<Expense>): Expense {
  const now = new Date().toISOString();
  return {
    id: "e1",
    description: "test",
    categoryId: "c1",
    kind: "actual",
    amount: 0,
    plannedAmount: 0,
    actualAmount: 0,
    status: "paid",
    date: now.slice(0, 10),
    paidBy: "pool",
    allocationMethod: "equal",
    eligibleParticipantIds: [],
    weights: {},
    receiptAttachmentId: null,
    notes: "",
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

function makeContribution(
  participantId: string,
  actual: number,
  planned = actual,
): Contribution {
  const now = new Date().toISOString();
  return {
    id: `c_${participantId}`,
    participantId,
    plannedAmount: planned,
    actualAmount: actual,
    date: now.slice(0, 10),
    notes: "",
    createdAt: now,
  };
}

export function runFinanceTests(): { passed: number; failed: number } {
  const errors: string[] = [];
  let passed = 0;
  const ok = (label: string, actual: unknown, expected: unknown) => {
    const before = errors.length;
    assertEqual(actual, expected, label, errors);
    if (errors.length === before) passed++;
  };

  // --- Test 1: equal split ---
  {
    const p = makeParticipants(["A", "B", "C"]);
    const e = makeExpense({ amount: 900, actualAmount: 900 });
    const a = allocateExpense(e, p);
    ok("T1 equal split", a.shares, { A: 300, B: 300, C: 300 });
    ok("T1 total", a.total, 900);
  }

  // --- Test 2: rounding remainder ---
  {
    const s = splitEvenly(100, 3);
    ok("T2 splitEvenly", s, [34, 33, 33]);
    ok(
      "T2 sum",
      s.reduce((x, y) => x + y, 0),
      100,
    );
  }

  // --- Test 3: adding/removing participant ---
  {
    const p3 = makeParticipants(["A", "B", "C"]);
    const e = makeExpense({ amount: 1200, actualAmount: 1200 });
    const a3 = allocateExpense(e, p3);
    ok("T3 three-way", a3.shares, { A: 400, B: 400, C: 400 });

    const p4 = makeParticipants(["A", "B", "C", "D"]);
    const a4 = allocateExpense(e, p4);
    ok("T3 four-way", a4.shares, { A: 300, B: 300, C: 300, D: 300 });
  }

  // --- Test 4: partial contribution ---
  {
    const trip: Trip = {
      id: "t",
      name: "",
      description: "",
      startDate: null,
      endDate: null,
      status: "planning",
      emergencyReserveMode: "fixed",
      emergencyReserveValue: 0,
      createdAt: "",
      updatedAt: "",
    };
    const contributions = [makeContribution("A", 400, 1000)];
    const totals = computeTripTotals({
      trip,
      participants: makeParticipants(["A"]),
      contributions,
      expenses: [],
    });
    ok("T4 actual", totals.actualContributions, 400);
    ok("T4 planned", totals.plannedContributions, 1000);
    ok("T4 outstanding", totals.outstandingContributions, 600);
  }

  // --- Test 5: cash balance vs settlement ---
  {
    const p = makeParticipants(["A", "B", "C"]);
    const e = makeExpense({ amount: 900, actualAmount: 900, paidBy: "pool" });
    const contributions = [makeContribution("A", 900)];
    const trip: Trip = {
      id: "t",
      name: "",
      description: "",
      startDate: null,
      endDate: null,
      status: "planning",
      emergencyReserveMode: "fixed",
      emergencyReserveValue: 0,
      createdAt: "",
      updatedAt: "",
    };
    const totals = computeTripTotals({
      trip,
      participants: p,
      contributions,
      expenses: [e],
    });
    ok("T5 contributions", totals.actualContributions, 900);
    ok("T5 cash balance", totals.groupCashBalance, 0);

    const balances = computeParticipantBalances(p, contributions, [e]);
    const map = Object.fromEntries(
      balances.map((b) => [b.participantId, b.net]),
    );
    ok("T5 net balances", map, { A: 600, B: -300, C: -300 });
  }

  // --- Test 6: participant-paid shared expense ---
  {
    const p = makeParticipants(["A", "B", "C"]);
    const e = makeExpense({ amount: 600, actualAmount: 600, paidBy: "A" });
    const balances = computeParticipantBalances(p, [], [e]);
    const map = Object.fromEntries(
      balances.map((b) => [b.participantId, b.net]),
    );
    ok("T6 net balances", map, { A: 400, B: -200, C: -200 });
    ok(
      "T6 sum zero",
      balances.reduce((s, b) => s + b.net, 0),
      0,
    );
  }

  // --- Test 7: zero participants ---
  {
    const e = makeExpense({ amount: 100, actualAmount: 100 });
    const a = allocateExpense(e, []);
    ok("T7 total preserved", a.total, 100);
    ok("T7 warning present", a.warning !== null, true);
    ok("T7 finite", Number.isFinite(a.total), true);
  }

  // --- Test 8: emergency reserve does not double count ---
  {
    const trip: Trip = {
      id: "t",
      name: "",
      description: "",
      startDate: null,
      endDate: null,
      status: "planning",
      emergencyReserveMode: "fixed",
      emergencyReserveValue: 1000,
      createdAt: "",
      updatedAt: "",
    };
    const totals = computeTripTotals({
      trip,
      participants: makeParticipants(["A"]),
      contributions: [],
      expenses: [],
    });
    ok("T8 reserve target", totals.emergencyReserveTarget, 1000);
    ok("T8 expense total", totals.actualExpenseTotal, 0);
  }

  // --- Test 9: planned vs actual expense ---
  {
    const p = makeParticipants(["A"]);
    const planned = makeExpense({
      id: "e1",
      kind: "planned",
      amount: 3000,
      plannedAmount: 3000,
      actualAmount: 0,
    });
    const actual = makeExpense({
      id: "e1",
      kind: "actual",
      amount: 3300,
      plannedAmount: 3000,
      actualAmount: 3300,
    });
    const trip: Trip = {
      id: "t",
      name: "",
      description: "",
      startDate: null,
      endDate: null,
      status: "planning",
      emergencyReserveMode: "fixed",
      emergencyReserveValue: 0,
      createdAt: "",
      updatedAt: "",
    };
    const totalsPlanned = computeTripTotals({
      trip,
      participants: p,
      contributions: [],
      expenses: [planned],
    });
    const totalsActual = computeTripTotals({
      trip,
      participants: p,
      contributions: [],
      expenses: [actual],
    });
    ok("T9 planned", totalsPlanned.plannedExpenseTotal, 3000);
    ok("T9 actual", totalsActual.actualExpenseTotal, 3300);
    ok("T9 no double count", totalsActual.plannedExpenseTotal, 0);
  }

  const failed = errors.length;
  if (failed > 0) {
    console.error("=== FINANCE TESTS FAILED ===");
    errors.forEach((e) => console.error(e));
  } else {
    console.log("=== ALL FINANCE TESTS PASSED ===");
  }
  return { passed, failed };
}
