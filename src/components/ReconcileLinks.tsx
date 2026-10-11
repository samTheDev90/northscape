import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { useStore } from "../lib/store";
import { subscribeUsers, type DirectoryUser } from "../lib/userDirectory";
import { reconcileUserLink } from "../lib/linking";

/**
 * Runs an automatic link between the current user and a matching
 * participant record after sign-in. Renders nothing.
 * Mount inside the authenticated app tree.
 */
export default function ReconcileLinks() {
  const { user, isAuthenticated, refreshProfile } = useAuth();
  const { data, ready } = useStore();
  const [users, setUsers] = useState<DirectoryUser[]>([]);

  // Subscribe to all users (only when signed in).
  useEffect(() => {
    if (!isAuthenticated) {
      setUsers([]);
      return;
    }
    const unsub = subscribeUsers(setUsers);
    return () => unsub();
  }, [isAuthenticated]);

  // Attempt a one-time link whenever prerequisites change.
  useEffect(() => {
    if (!user || !ready || !isAuthenticated) return;
    if (user.participantId) return;

    let cancelled = false;

    (async () => {
      const linked = await reconcileUserLink({
        uid: user.id,
        displayName: user.displayName,
        tripData: data,
        users,
      });
      if (!cancelled && linked) {
        await refreshProfile();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, ready, isAuthenticated, data, users, refreshProfile]);

  return null;
}
