// ============================================================================
// Money utilities — integer taka arithmetic with deterministic remainder
// distribution. All amounts in this application are non-negative integers.
// ============================================================================

export function toInt(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.round(v);
}

export function formatBDT(amount: number): string {
  const n = toInt(amount);
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}৳${abs.toLocaleString("en-US")}`;
}

/**
 * Split `total` into `count` shares as evenly as possible, distributing the
 * remainder (total mod count) to the FIRST `remainder` slots so that
 * sum(shares) === total exactly. Zero count returns an empty array.
 */
export function splitEvenly(total: number, count: number): number[] {
  if (count <= 0) return [];
  const t = toInt(total);
  const base = Math.floor(t / count);
  let remainder = t - base * count;
  const result: number[] = new Array(count);
  for (let i = 0; i < count; i++) {
    result[i] = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
  }
  return result;
}

/**
 * Split `total` according to integer weights. Weights must sum to > 0.
 * Remainders are distributed deterministically by index.
 */
export function splitWeighted(total: number, weights: number[]): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const totalWeight = weights.reduce((s, w) => s + Math.max(0, w), 0);
  if (totalWeight <= 0) return splitEvenly(total, n);

  const t = toInt(total);
  const raw = weights.map((w) => (t * Math.max(0, w)) / totalWeight);
  const floored = raw.map((r) => Math.floor(r));
  let assigned = floored.reduce((s, v) => s + v, 0);
  let remainder = t - assigned;

  // Distribute the remainder to entries with the largest fractional part
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  const result = [...floored];
  for (let k = 0; k < order.length && remainder > 0; k++) {
    result[order[k].i] += 1;
    remainder--;
  }
  return result;
}

export function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}
