import { doc, updateDoc } from "firebase/firestore";
import { firestore, USERS_COLLECTION } from "./firebase";
import type { AppData } from "./types";
import type { DirectoryUser } from "./userDirectory";

// ============================================================================
// Linking — match users to participants by name and reconcile.
// ============================================================================

export function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Find a participant whose name matches the given display name.
 * Returns null if no match or if the display name is empty.
 */
export function findMatchingParticipantId(
  displayName: string,
  tripData: AppData,
): string | null {
  const normalized = normalizeName(displayName);
  if (!normalized) return null;
  for (const p of tripData.participants) {
    if (normalizeName(p.name) === normalized) return p.id;
  }
  return null;
}

/**
 * Given a participant id, find the linked user (if any).
 */
export function findLinkedUser(
  participantId: string,
  users: DirectoryUser[],
): DirectoryUser | undefined {
  return users.find((u) => u.participantId === participantId);
}

/**
 * Attempt to link the current user to a matching participant.
 * Called automatically after sign-in. Fails silently if no match.
 * Returns the participant id if a link was made, otherwise null.
 */
export async function reconcileUserLink(params: {
  uid: string;
  displayName: string;
  tripData: AppData;
  users: DirectoryUser[];
}): Promise<string | null> {
  const { uid, displayName, tripData, users } = params;

  // Already linked? Nothing to do.
  const me = users.find((u) => u.uid === uid);
  if (me?.participantId) return me.participantId;

  // Find a participant matching this user's name.
  const matchId = findMatchingParticipantId(displayName, tripData);
  if (!matchId) return null;

  // Is that participant already linked to someone else?
  const taken = users.some((u) => u.uid !== uid && u.participantId === matchId);
  if (taken) return null;

  // Link them.
  try {
    await updateDoc(doc(firestore, USERS_COLLECTION, uid), {
      participantId: matchId,
    });
    return matchId;
  } catch (err) {
    console.error("Failed to link user to participant:", err);
    return null;
  }
}

/**
 * Participants with no linked user.
 */
export function getUnlinkedParticipantIds(
  tripData: AppData,
  users: DirectoryUser[],
): string[] {
  const linked = new Set(
    users.map((u) => u.participantId).filter(Boolean) as string[],
  );
  return tripData.participants
    .filter((p) => !linked.has(p.id))
    .map((p) => p.id);
}

/**
 * Users who are not linked to any participant.
 * Excludes admins (they don't need to be participants).
 */
export function getUnlinkedUsers(users: DirectoryUser[]): DirectoryUser[] {
  return users.filter((u) => u.role !== "admin" && !u.participantId);
}
