// ============================================================================
// Schedule helpers — conflict detection for the itinerary.
// Handles overnight activities (start > end, crossing midnight).
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

/**
 * Duration in minutes. If end is before start, treats it as overnight
 * (crossing midnight). Example: 20:45 → 07:10 = 625 minutes (10h 25m).
 */
export function durationMinutes(start: string, end: string): number {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  if (s < 0 || e < 0) return 0;
  return e >= s ? e - s : 24 * 60 - s + e;
}

/**
 * True when an activity's end time is strictly before its start time,
 * meaning it crosses midnight.
 */
export function isOvernight(start: string, end: string): boolean {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  if (s < 0 || e < 0) return false;
  return e < s;
}

export interface Conflict {
  kind: "overlap" | "invalid-time" | "sequence";
  message: string;
  activityIds: string[];
}

interface Interval {
  id: string;
  title: string;
  start: number;
  end: number;
  overnight: boolean;
}

/**
 * Detect scheduling conflicts within a single day's activities.
 * - "overlap": two activities' time ranges intersect.
 * - "invalid-time": malformed time, or zero duration.
 *
 * Overnight activities (end < start) are valid and treated as spanning
 * into the next day. Overlaps are computed against the unrolled interval.
 */
export function detectConflicts(
  activities: ItineraryActivity[],
): Conflict[] {
  const conflicts: Conflict[] = [];
  const sorted = [...activities].sort((a, b) => a.order - b.order);

  const intervals: Interval[] = [];

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

    if (e === s) {
      conflicts.push({
        kind: "invalid-time",
        message: `"${a.title}" has zero duration.`,
        activityIds: [a.id],
      });
      continue;
    }

    const overnight = e < s;
    intervals.push({
      id: a.id,
      title: a.title,
      // Unroll overnight: 20:45 → 07:10 becomes [1245, 1870].
      start: s,
      end: overnight ? e + 24 * 60 : e,
      overnight,
    });
  }

  // Pairwise overlap check (small n, fine).
  for (let i = 0; i < intervals.length; i++) {
    const a = intervals[i];
    for (let j = i + 1; j < intervals.length; j++) {
      const b = intervals[j];
      if (a.start < b.end && b.start < a.end) {
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
