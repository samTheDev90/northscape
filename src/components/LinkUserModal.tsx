import { useState, useEffect } from "react";
import { Link2, Unlink, Loader2, Search } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { firestore, USERS_COLLECTION } from "../lib/firebase";
import { useStore } from "../lib/store";
import { useToast } from "./Toast";
import Modal from "./Modal";
import Button from "./PrimaryButton";
import type { Participant } from "../lib/types";
import type { DirectoryUser } from "../lib/userDirectory";
import { normalizeName } from "../lib/linking";

interface Props {
  open: boolean;
  onClose: () => void;
  participant: Participant | null;
  users: DirectoryUser[];
}

export default function LinkUserModal({
  open,
  onClose,
  participant,
  users,
}: Props) {
  const { data } = useStore();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");

  // Reset search when opening
  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  if (!participant) return null;

  const currentLinkedUser = users.find(
    (u) => u.participantId === participant.id,
  );

  // Filter eligible users: participants only, not already linked elsewhere
  const availableUsers = users.filter((u) => {
    if (u.role === "admin") return false;
    if (u.participantId === participant.id) return false; // that's the current one
    if (u.participantId) return false; // linked to someone else
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      u.displayName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  const handleLink = async (userId: string) => {
    setBusy(true);
    try {
      await updateDoc(doc(firestore, USERS_COLLECTION, userId), {
        participantId: participant.id,
      });
      toast.success(
        `Linked ${participant.name} to an account`,
        "Account linked",
      );
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to link user.",
        "Link failed",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleUnlink = async () => {
    if (!currentLinkedUser) return;
    setBusy(true);
    try {
      await updateDoc(doc(firestore, USERS_COLLECTION, currentLinkedUser.uid), {
        participantId: null,
      });
      toast.info("Account unlinked", "Unlinked");
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to unlink.",
        "Unlink failed",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Link an account — ${participant.name}`}
      width="md"
    >
      <div className="space-y-4">
        {/* Currently linked user (if any) */}
        {currentLinkedUser && (
          <div className="rounded-xl border border-forest/40 bg-forest/5 p-4">
            <p className="text-[11px] text-forest uppercase tracking-wider mb-2 inline-flex items-center gap-1.5">
              <Link2 className="w-3 h-3" /> Currently linked
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purpleDark/60 flex items-center justify-center overflow-hidden shrink-0">
                {currentLinkedUser.photoUrl ? (
                  <img
                    src={currentLinkedUser.photoUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-peach font-serif text-sm">
                    {currentLinkedUser.displayName.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-textPrimary truncate">
                  {currentLinkedUser.displayName}
                </p>
                <p className="text-[11px] text-textSecondary truncate">
                  {currentLinkedUser.email}
                </p>
              </div>
              <button
                onClick={handleUnlink}
                disabled={busy}
                className="p-2 rounded-lg hover:bg-coral/20 text-coral shrink-0 disabled:opacity-50"
                aria-label="Unlink"
                title="Unlink"
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Unlink className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-textSecondary absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search accounts by name or email…"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-midnight/60 border border-purpleDark/70 text-textPrimary text-sm focus:outline-none focus:border-peach/60"
          />
        </div>

        {/* List */}
        <div className="max-h-72 overflow-y-auto rounded-xl border border-purpleDark/60 bg-midnight/30 divide-y divide-purpleDark/40">
          {availableUsers.length === 0 ? (
            <div className="p-6 text-center text-xs text-textSecondary">
              {query.trim()
                ? "No matching accounts."
                : "No unlinked accounts available. Invite someone first from the Accounts tab."}
            </div>
          ) : (
            availableUsers.map((u) => {
              const suggested =
                normalizeName(u.displayName) ===
                normalizeName(participant.name);
              return (
                <button
                  key={u.uid}
                  onClick={() => handleLink(u.uid)}
                  disabled={busy}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-purpleDark/40 transition-colors text-left disabled:opacity-50"
                >
                  <div className="w-9 h-9 rounded-full bg-purpleDark/60 flex items-center justify-center overflow-hidden shrink-0">
                    {u.photoUrl ? (
                      <img
                        src={u.photoUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-peach font-serif text-xs">
                        {u.displayName.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-textPrimary truncate">
                      {u.displayName}
                      {suggested && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-peach/15 text-peach border border-peach/40">
                          Name match
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-textSecondary truncate">
                      {u.email}
                    </p>
                  </div>
                  <Link2 className="w-4 h-4 text-peach shrink-0" />
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <p className="text-[11px] text-textSecondary">
            Linking lets expenses and contributions find the correct account.
          </p>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
