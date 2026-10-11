import { collection, onSnapshot, query } from "firebase/firestore";
import { firestore, USERS_COLLECTION } from "./firebase";
import type { UserRole } from "./types";

// ============================================================================
// User directory — read-only subscription to the /users collection.
// Used to link participants to their signed-up accounts.
// ============================================================================

export interface DirectoryUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  participantId?: string;
  nickname: string;
  photoUrl: string;
  contact: string;
  notes: string;
}

function pickString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

export function subscribeUsers(
  callback: (users: DirectoryUser[]) => void,
): () => void {
  return onSnapshot(
    query(collection(firestore, USERS_COLLECTION)),
    (snap) => {
      const users: DirectoryUser[] = [];
      for (const d of snap.docs) {
        const raw = d.data() as Record<string, unknown>;
        users.push({
          uid: d.id,
          email: pickString(raw.email),
          displayName: pickString(raw.displayName),
          role: raw.role === "admin" ? "admin" : "participant",
          participantId:
            typeof raw.participantId === "string" && raw.participantId
              ? raw.participantId
              : undefined,
          nickname: pickString(raw.nickname),
          photoUrl: pickString(raw.photoUrl),
          contact: pickString(raw.contact),
          notes: pickString(raw.notes),
        });
      }
      callback(users);
    },
    (err) => {
      console.error("Users subscription error:", err);
      callback([]);
    },
  );
}
