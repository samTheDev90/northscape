import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { firestore, INVITES_COLLECTION } from "./firebase";
import type { Invite, UserRole } from "./types";

// Characters that avoid confusion (no O/0, no I/1, no L).
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomBlock(len: number): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return out;
}

export function generateInviteCode(): string {
  return `PV-${randomBlock(4)}-${randomBlock(4)}`;
}

export function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

export async function createInvite(params: {
  displayName: string;
  email: string | null;
  role: UserRole;
  createdBy: string;
  participantId?: string | null;
}): Promise<Invite> {
  const code = generateInviteCode();
  const invite: Invite = {
    code,
    displayName: params.displayName.trim(),
    email: params.email ? params.email.trim().toLowerCase() : null,
    role: params.role,
    createdAt: new Date().toISOString(),
    createdBy: params.createdBy,
    used: false,
    usedBy: null,
    usedAt: null,
    participantId: params.participantId ?? null,
  };
  await setDoc(doc(firestore, INVITES_COLLECTION, code), invite);
  return invite;
}

export async function fetchInvite(code: string): Promise<Invite | null> {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  const snap = await getDoc(doc(firestore, INVITES_COLLECTION, normalized));
  if (!snap.exists()) return null;
  return snap.data() as Invite;
}

export async function markInviteUsed(code: string, uid: string): Promise<void> {
  await updateDoc(doc(firestore, INVITES_COLLECTION, normalizeCode(code)), {
    used: true,
    usedBy: uid,
    usedAt: new Date().toISOString(),
  });
}

export async function deleteInvite(code: string): Promise<void> {
  await deleteDoc(doc(firestore, INVITES_COLLECTION, code));
}

export function subscribeInvites(
  callback: (invites: Invite[]) => void,
): () => void {
  const q = query(
    collection(firestore, INVITES_COLLECTION),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => d.data() as Invite));
    },
    (err) => {
      console.error("Invites subscription error:", err);
    },
  );
}
