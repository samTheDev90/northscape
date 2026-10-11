import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, firestore, USERS_COLLECTION } from "./firebase";
import { fetchInvite, markInviteUsed } from "./invites";
import type { UserRole } from "./types";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  participantId?: string;
  nickname: string;
  photoUrl: string;
  contact: string;
  notes: string;
}

export interface ProfilePatch {
  displayName?: string;
  nickname?: string;
  photoUrl?: string;
  contact?: string;
  notes?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAdmin: boolean;
  isParticipant: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  redeemInvite: (params: {
    code: string;
    email: string;
    password: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  updateOwnProfile: (patch: ProfilePatch) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function friendlyAuthError(err: unknown): string {
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code: string }).code;
    switch (code) {
      case "auth/email-already-in-use":
        return "This email already has an account. Try signing in instead.";
      case "auth/invalid-email":
        return "That email address looks invalid.";
      case "auth/weak-password":
        return "Password must be at least 6 characters.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Incorrect email or password.";
      case "auth/too-many-requests":
        return "Too many attempts. Try again in a few minutes.";
      case "auth/network-request-failed":
        return "Network error. Check your internet connection.";
      default:
        return "Something went wrong. Please try again.";
    }
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}

async function loadUserProfileOnce(
  fbUser: FirebaseUser,
): Promise<AuthUser | null> {
  const ref = doc(firestore, USERS_COLLECTION, fbUser.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const data = snap.data() as {
    role?: UserRole;
    displayName?: string;
    participantId?: string;
    nickname?: string;
    photoUrl?: string;
    contact?: string;
    notes?: string;
  };

  return {
    id: fbUser.uid,
    email: fbUser.email ?? "",
    displayName: data.displayName ?? fbUser.email?.split("@")[0] ?? "User",
    role: data.role ?? "participant",
    participantId: data.participantId,
    nickname: data.nickname ?? "",
    photoUrl: data.photoUrl ?? "",
    contact: data.contact ?? "",
    notes: data.notes ?? "",
  };
}

async function loadUserProfile(
  fbUser: FirebaseUser,
  attempts = 8,
  delayMs = 350,
): Promise<AuthUser> {
  for (let i = 0; i < attempts; i++) {
    const profile = await loadUserProfileOnce(fbUser);
    if (profile) return profile;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  await fbSignOut(auth);
  throw new Error(
    "This account is not activated. Ask an admin for an invite code.",
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const signingUpRef = React.useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      if (signingUpRef.current) {
        await new Promise((r) => setTimeout(r, 400));
      }
      try {
        const profile = await loadUserProfile(fbUser);
        setUser(profile);
      } catch (err) {
        console.error("Profile load failed:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const cred = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      const profile = await loadUserProfile(cred.user);
      setUser(profile);
    } catch (err) {
      throw new Error(friendlyAuthError(err));
    }
  }, []);

  const redeemInvite = useCallback(
    async (params: { code: string; email: string; password: string }) => {
      const { code, email, password } = params;

      if (!code.trim()) throw new Error("Invite code is required.");
      if (!email.trim()) throw new Error("Email is required.");
      if (password.length < 6)
        throw new Error("Password must be at least 6 characters.");

      const invite = await fetchInvite(code);
      if (!invite) throw new Error("Invalid invite code.");
      if (invite.used) throw new Error("This invite has already been used.");
      if (invite.email && invite.email !== email.trim().toLowerCase()) {
        throw new Error("This invite is locked to a different email address.");
      }

      signingUpRef.current = true;

      let cred;
      try {
        cred = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        );
      } catch (err) {
        signingUpRef.current = false;
        throw new Error(friendlyAuthError(err));
      }

      // Create the user profile doc.
      // If the invite carries a participantId, link instantly.
      try {
        await setDoc(doc(firestore, USERS_COLLECTION, cred.user.uid), {
          email: cred.user.email,
          displayName: invite.displayName,
          role: invite.role,
          inviteCode: invite.code,
          participantId: invite.participantId ?? null,
          nickname: "",
          photoUrl: "",
          contact: "",
          notes: "",
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        signingUpRef.current = false;
        await fbSignOut(auth);
        throw new Error(
          "Could not complete activation. The invite may be invalid or expired.",
        );
      }

      // Mark the invite as used (best effort).
      try {
        await markInviteUsed(invite.code, cred.user.uid);
      } catch (err) {
        console.warn("Could not mark invite as used:", err);
      }

      const profile = await loadUserProfile(cred.user);
      setUser(profile);
      signingUpRef.current = false;
    },
    [],
  );

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
    setUser(null);
  }, []);

  const updateOwnProfile = useCallback(async (patch: ProfilePatch) => {
    const current = auth.currentUser;
    if (!current) throw new Error("Not signed in.");
    const ref = doc(firestore, USERS_COLLECTION, current.uid);
    const allowed: Record<string, unknown> = {};
    if (patch.displayName !== undefined)
      allowed.displayName = patch.displayName.trim();
    if (patch.nickname !== undefined) allowed.nickname = patch.nickname.trim();
    if (patch.photoUrl !== undefined) allowed.photoUrl = patch.photoUrl.trim();
    if (patch.contact !== undefined) allowed.contact = patch.contact.trim();
    if (patch.notes !== undefined) allowed.notes = patch.notes.trim();

    await updateDoc(ref, allowed);

    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const refreshProfile = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) return;
    try {
      const profile = await loadUserProfileOnce(current);
      if (profile) setUser(profile);
    } catch (err) {
      console.error("Refresh failed:", err);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAdmin: user?.role === "admin",
      isParticipant: user?.role === "participant",
      isAuthenticated: user !== null,
      signIn,
      redeemInvite,
      signOut,
      updateOwnProfile,
      refreshProfile,
    }),
    [
      user,
      loading,
      signIn,
      redeemInvite,
      signOut,
      updateOwnProfile,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
