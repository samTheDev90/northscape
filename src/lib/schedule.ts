// ============================================================================
// Schedule helpers — conflict detection for the itinerary.
// All times are "HH:mm" 24-hour strings on a single day (dayIndex).
// ============================================================================

import type { ItineraryActivity } from "./types";

export function timeToMinutes(hhmm: string): number {
  if (!/^\d{1,2}:\d{2}$/.test(hhmm)) return -1;
  const [h, m] = hhmm.split(":").map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return -1;
  return h * 60 + m;
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function durationMinutes(start: string, end: string): number {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  if (s < 0 || e < 0) return 0;
  // If end is before start, treat as overnight.
  return e >= s ? e - s : 24 * 60 - s + e;
}

export interface Conflict {
  kind: "overlap" | "invalid-time" | "sequence";
  message: string;
  activityIds: string[];
}

/**
 * Detect scheduling conflicts within a single day's activities.
 * - "overlap": two activities' time ranges intersect.
 * - "invalid-time": end time is not after start time (non-overnight).
 */
export function detectConflicts(activities: ItineraryActivity[]): Conflict[] {
  const conflicts: Conflict[] = [];
  const sorted = [...activities].sort((a, b) => a.order - b.order);

  for (const a of sorted) {
    const s = timeToMinutes(a.startTime);
    const e = timeToMinutes(a.endTime);
    if (s < 0 || e < 0) {
      conflicts.push({
        kind: "invalid-time",
        message: `"${a.title}" has an invalid time.`,
        activityIds: [a.id],
      });
      continue;
    }
    if (e <= s) {
      conflicts.push({
        kind: "invalid-time",
        message: `"${a.title}" ends at or before it starts.`,
        activityIds: [a.id],
      });
    }
  }

  // Pairwise overlap check (small n, fine)
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    const aS = timeToMinutes(a.startTime);
    const aE = timeToMinutes(a.endTime);
    if (aS < 0 || aE < 0 || aE <= aS) continue;

    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j];
      const bS = timeToMinutes(b.startTime);
      const bE = timeToMinutes(b.endTime);
      if (bS < 0 || bE < 0 || bE <= bS) continue;

      // Overlap if a starts before b ends AND b starts before a ends
      if (aS < bE && bS < aE) {
        conflicts.push({
          kind: "overlap",
          message: `"${a.title}" overlaps with "${b.title}".`,
          activityIds: [a.id, b.id],
        });
      }
    }
  }

  return conflicts;
}

export function totalPlannedMinutes(activities: ItineraryActivity[]): number {
  return activities.reduce(
    (s, a) => s + durationMinutes(a.startTime, a.endTime),
    0,
  );
}

export function totalPlannedCost(activities: ItineraryActivity[]): number {
  return activities.reduce((s, a) => s + (a.estimatedCost || 0), 0);
}
