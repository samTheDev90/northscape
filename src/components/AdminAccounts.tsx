import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Copy,
  Check,
  Ticket,
  X,
  Loader2,
  Users,
  Link2,
  Link2Off,
  Shield,
  Mail,
  Send,
} from "lucide-react";
import { doc, deleteDoc, updateDoc } from "firebase/firestore";
import { firestore, USERS_COLLECTION } from "../lib/firebase";
import { useStore } from "../lib/store";
import { useAuth } from "../lib/auth";
import { useToast } from "./Toast";
import { useConfirm } from "./ConfirmProvider";
import { deleteInvite, subscribeInvites } from "../lib/invites";
import { subscribeUsers, type DirectoryUser } from "../lib/userDirectory";
import { getUnlinkedUsers, normalizeName } from "../lib/linking";
import { sendOne } from "../lib/email";
import type { Invite, UserRole } from "../lib/types";
import Button from "./PrimaryButton";
import { Select, TextInput } from "./FormField";
import Modal from "./Modal";
import EmailComposerModal from "./EmailComposerModal";

type Tab = "invites" | "users";

export default function AdminAccounts() {
  const { data, addParticipant } = useStore();
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const [tab, setTab] = useState<Tab>("invites");
  const [invites, setInvites] = useState<Invite[]>([]);
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] = useState<Invite | null>(null);
  const [justCreatedEmailed, setJustCreatedEmailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);

  useEffect(() => {
    const unsub1 = subscribeInvites(setInvites);
    const unsub2 = subscribeUsers(setUsers);
    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  const { active, used } = useMemo(() => {
    const a: Invite[] = [];
    const u: Invite[] = [];
    for (const i of invites) (i.used ? u : a).push(i);
    return { active: a, used: u };
  }, [invites]);

  const unlinkedUsers = useMemo(() => getUnlinkedUsers(users), [users]);

  const participantById = useMemo(() => {
    const m: Record<string, { name: string }> = {};
    for (const p of data.participants) m[p.id] = { name: p.name };
    return m;
  }, [data.participants]);

  const handleUnlinkUser = async (u: DirectoryUser) => {
    const ok = await confirm({
      title: `Unlink ${u.displayName}?`,
      message:
        "The user keeps their account but is no longer connected to a participant record.",
      confirmText: "Unlink",
      danger: true,
    });
    if (!ok) return;
    try {
      await updateDoc(doc(firestore, USERS_COLLECTION, u.uid), {
        participantId: null,
      });
      toast.info(`${u.displayName} unlinked`, "Unlinked");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unlink failed.",
        "Error",
      );
    }
  };

  const handleLinkUserToMatch = async (u: DirectoryUser) => {
    const match = data.participants.find(
      (p) => normalizeName(p.name) === normalizeName(u.displayName),
    );
    if (!match) {
      toast.error(
        `No participant named "${u.displayName}" found.`,
        "No match",
      );
      return;
    }
    const taken = users.some(
      (x) => x.uid !== u.uid && x.participantId === match.id,
    );
    if (taken) {
      toast.error(
        `"${match.name}" is already linked to another account.`,
        "Already linked",
      );
      return;
    }
    try {
      await updateDoc(doc(firestore, USERS_COLLECTION, u.uid), {
        participantId: match.id,
      });
      toast.success(
        `${u.displayName} linked to "${match.name}"`,
        "Linked",
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Link failed.",
        "Error",
      );
    }
  };

  const handleCreateWithParticipant = async (params: {
    displayName: string;
    email: string | null;
    role: UserRole;
    sendEmail: boolean;
  }): Promise<{ emailed: boolean }> => {
    let participantId: string | null = null;

    if (params.role === "participant") {
      const normalized = normalizeName(params.displayName);
      const existing = data.participants.find(
        (p) => normalizeName(p.name) === normalized,
      );
      if (existing) {
        participantId = existing.id;
      } else {
        const created = addParticipant({
          name: params.displayName.trim(),
          status: "confirmed",
          notes: "Auto-created from invite",
        });
        participantId = created.id;
      }
    }

    const { createInvite } = await import("../lib/invites");
    const invite = await createInvite({
      displayName: params.displayName,
      email: params.email,
      role: params.role,
      createdBy: currentUser?.id ?? "",
      participantId,
    });

    setCreating(false);
    setJustCreated(invite);

    // Send the invite code by email if requested.
    // NOTE: the greeting ("Hi X,") is added by the EmailJS template itself,
    // so the message body here starts directly with the content.
    let emailed = false;
    if (params.sendEmail && invite.email) {
      try {
        await sendOne({
          to_email: invite.email,
          to_name: invite.displayName,
          subject: `You're invited to ${data.trip.name}`,
          message:
            `You've been invited to join ${data.trip.name} on Northscape — a private trip planner for our group.\n\n` +
            `Your invite code is:\n\n` +
            `    ${invite.code}\n\n` +
            `To activate your account:\n` +
            `1. Open the app (link below)\n` +
            `2. Click "Redeem Invite"\n` +
            `3. Enter the code above\n` +
            `4. Choose your own password\n\n` +
            `App link: https://samthedev90.github.io/northscape/\n\n` +
            `This code can only be used once. If you didn't expect this email, you can safely ignore it.`,
          trip_name: data.trip.name,
        });
        emailed = true;
        toast.success(
          `Invite sent to ${invite.email}`,
          "Email delivered",
        );
      } catch (err) {
        console.error("Failed to email invite:", err);
        toast.warning(
          `Invite created, but email failed. Copy the code and send it manually.`,
          "Email failed",
        );
      }
    }

    setJustCreatedEmailed(emailed);
    setError(null);
    if (!params.sendEmail) {
      toast.success("Invite code created", "Ready to share");
    }
    return { emailed };
  };

  const handleDeleteUser = async (u: DirectoryUser) => {
    const ok = await confirm({
      title: `Delete ${u.displayName}'s account?`,
      message:
        "Their profile will be removed and they will no longer be able to sign in. If they ever try to sign up again with the same email, the app will automatically clean up the leftover auth record — so the email can be reused with a new invite.",
      confirmText: "Delete account",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(firestore, USERS_COLLECTION, u.uid));
      toast.success(`${u.displayName} removed`, "Account deleted");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Delete failed.",
        "Error",
      );
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-midnight/60 border border-purpleDark/60 flex-1">
          <button
            onClick={() => setTab("invites")}
            className={`flex-1 py-2 rounded-lg text-sm transition-colors inline-flex items-center justify-center gap-2 ${
              tab === "invites"
                ? "bg-peach text-midnight font-medium"
                : "text-textSecondary hover:text-textPrimary"
            }`}
          >
            <Ticket className="w-4 h-4" />
            Invites
          </button>
          <button
            onClick={() => setTab("users")}
            className={`flex-1 py-2 rounded-lg text-sm transition-colors inline-flex items-center justify-center gap-2 ${
              tab === "users"
                ? "bg-peach text-midnight font-medium"
                : "text-textSecondary hover:text-textPrimary"
            }`}
          >
            <Users className="w-4 h-4" />
            Accounts ({users.length})
            {unlinkedUsers.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-coral/20 text-coral border border-coral/40">
                {unlinkedUsers.length}
              </span>
            )}
          </button>
        </div>
        <Button onClick={() => setEmailOpen(true)}>
          <Mail className="w-4 h-4" /> Send email
        </Button>
      </div>

      {tab === "invites" && (
        <section className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="font-serif text-lg text-textPrimary mb-1 flex items-center gap-2">
                <Ticket className="w-4 h-4 text-peach" />
                Invite participants
              </h2>
              <p className="text-xs text-textSecondary max-w-md">
                Create an invite — you can send the code by email in one
                step, or copy it and share it however you like.
              </p>
            </div>
            <Button onClick={() => setCreating(true)}>
              <Plus className="w-4 h-4" /> New invite
            </Button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-coral/40 bg-coral/10 px-3 py-2 text-xs text-coral">
              {error}
            </div>
          )}

          {active.length === 0 && used.length === 0 && (
            <p className="text-sm text-textSecondary">
              No invites yet. Click "New invite" to add your first
              participant.
            </p>
          )}

          {active.length > 0 && (
            <div className="space-y-2 mb-5">
              <p className="text-[11px] uppercase tracking-wider text-textSecondary mb-2">
                Active invites ({active.length})
              </p>
              {active.map((i) => (
                <InviteRow
                  key={i.code}
                  invite={i}
                  participantName={
                    i.participantId
                      ? participantById[i.participantId]?.name
                      : undefined
                  }
                  onDelete={async () => {
                    const ok = await confirm({
                      title: `Delete invite ${i.code}?`,
                      message:
                        "This code will no longer be usable to sign up.",
                      confirmText: "Delete",
                      danger: true,
                    });
                    if (ok) {
                      await deleteInvite(i.code);
                      toast.success("Invite deleted", "Removed");
                    }
                  }}
                />
              ))}
            </div>
          )}

          {used.length > 0 && (
            <div className="space-y-2 pt-4 border-t border-purpleDark/40">
              <p className="text-[11px] uppercase tracking-wider text-textSecondary mb-2">
                Used invites ({used.length})
              </p>
              {used.map((i) => (
                <InviteRow
                  key={i.code}
                  invite={i}
                  participantName={
                    i.participantId
                      ? participantById[i.participantId]?.name
                      : undefined
                  }
                  onDelete={async () => {
                    const ok = await confirm({
                      title: `Delete used invite ${i.code}?`,
                      message:
                        "The account remains active — only the invite record is removed.",
                      confirmText: "Delete",
                      danger: true,
                    });
                    if (ok) {
                      await deleteInvite(i.code);
                      toast.success("Invite deleted", "Removed");
                    }
                  }}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "users" && (
        <>
          {unlinkedUsers.length > 0 && (
            <section className="rounded-2xl border border-gold/40 bg-gold/5 p-5">
              <h2 className="font-serif text-base text-gold mb-1 flex items-center gap-2">
                <Link2Off className="w-4 h-4" />
                {unlinkedUsers.length} account
                {unlinkedUsers.length === 1 ? "" : "s"} not linked
              </h2>
              <p className="text-xs text-textSecondary mb-4">
                These users signed up but aren't connected to a participant
                record. Link them manually below.
              </p>
            </section>
          )}

          <section className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 overflow-hidden">
            <div className="px-5 py-4 border-b border-purpleDark/60">
              <h2 className="font-serif text-base text-textPrimary">
                All accounts ({users.length})
              </h2>
            </div>
            {users.length === 0 ? (
              <p className="p-6 text-sm text-textSecondary text-center">
                No accounts yet.
              </p>
            ) : (
              <div className="divide-y divide-purpleDark/40">
                {users.map((u) => {
                  const linkedParticipant = u.participantId
                    ? participantById[u.participantId]
                    : null;
                  const isLinked = !!linkedParticipant;
                  const nameMatch = data.participants.find(
                    (p) =>
                      normalizeName(p.name) === normalizeName(u.displayName),
                  );
                  return (
                    <div
                      key={u.uid}
                      className="px-5 py-4 flex flex-wrap items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-full bg-purpleDark/60 flex items-center justify-center overflow-hidden shrink-0 border border-peach/20">
                        {u.photoUrl ? (
                          <img
                            src={u.photoUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-peach font-serif text-sm">
                            {u.displayName.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-textPrimary truncate">
                            {u.displayName}
                          </p>
                          {u.role === "admin" && (
                            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-gold/20 text-gold border border-gold/40 inline-flex items-center gap-1">
                              <Shield className="w-2.5 h-2.5" /> admin
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-textSecondary truncate">
                          {u.email}
                        </p>
                        {isLinked ? (
                          <p className="text-[10px] text-forest mt-0.5 inline-flex items-center gap-1">
                            <Link2 className="w-2.5 h-2.5" /> Linked to{" "}
                            {linkedParticipant!.name}
                          </p>
                        ) : (
                          u.role !== "admin" && (
                            <p className="text-[10px] text-coral mt-0.5 inline-flex items-center gap-1">
                              <Link2Off className="w-2.5 h-2.5" /> Not linked
                            </p>
                          )
                        )}
                      </div>

                      <div className="flex gap-2">
                        {u.role !== "admin" && !isLinked && nameMatch && (
                          <button
                            onClick={() => handleLinkUserToMatch(u)}
                            className="text-[11px] px-2.5 py-1.5 rounded-lg bg-peach text-midnight font-medium hover:bg-coral transition-colors inline-flex items-center gap-1"
                          >
                            <Link2 className="w-3 h-3" />
                            Link to "{nameMatch.name}"
                          </button>
                        )}
                        {u.role !== "admin" && isLinked && (
                          <button
                            onClick={() => handleUnlinkUser(u)}
                            className="text-[11px] px-2.5 py-1.5 rounded-lg border border-purpleDark/60 text-textSecondary hover:text-coral hover:border-coral/40 transition-colors inline-flex items-center gap-1"
                          >
                            <Link2Off className="w-3 h-3" /> Unlink
                          </button>
                        )}
                        {u.uid !== currentUser?.id && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="text-[11px] px-2.5 py-1.5 rounded-lg border border-purpleDark/60 text-textSecondary hover:text-coral hover:border-coral/40 transition-colors inline-flex items-center gap-1"
                            title="Delete account"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      <InviteModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={handleCreateWithParticipant}
        onError={setError}
      />

      <ShowCodeModal
        invite={justCreated}
        emailed={justCreatedEmailed}
        onClose={() => {
          setJustCreated(null);
          setJustCreatedEmailed(false);
        }}
      />

      <EmailComposerModal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        participants={data.participants}
        users={users}
        tripName={data.trip.name}
      />
    </div>
  );
}

function InviteRow({
  invite,
  participantName,
  onDelete,
}: {
  invite: Invite;
  participantName?: string;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(invite.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
        invite.used
          ? "border-purpleDark/40 bg-midnight/30 opacity-70"
          : "border-purpleDark/60 bg-midnight/50"
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm text-textPrimary truncate">
          {invite.displayName}
          {invite.role === "admin" && (
            <span className="ml-2 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-gold/20 text-gold border border-gold/40">
              admin
            </span>
          )}
        </p>
        <p className="text-[11px] text-textSecondary truncate">
          {invite.email ?? "No email lock"}
        </p>
        {participantName && (
          <p className="text-[10px] text-forest mt-0.5 inline-flex items-center gap-1">
            <Link2 className="w-2.5 h-2.5" /> Bound to participant "
            {participantName}"
          </p>
        )}
        <p className="font-mono text-xs text-peach mt-0.5">{invite.code}</p>
      </div>

      {!invite.used && (
        <button
          onClick={copy}
          className="p-2 rounded-lg hover:bg-purpleDark/60 text-textSecondary"
          aria-label="Copy code"
          title="Copy code"
        >
          {copied ? (
            <Check className="w-4 h-4 text-forest" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      )}

      <button
        onClick={onDelete}
        className="p-2 rounded-lg hover:bg-coral/20 text-coral"
        aria-label="Delete invite"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function InviteModal({
  open,
  onClose,
  onCreated,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (params: {
    displayName: string;
    email: string | null;
    role: UserRole;
    sendEmail: boolean;
  }) => Promise<{ emailed: boolean }>;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [lockEmail, setLockEmail] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [role, setRole] = useState<UserRole>("participant");
  const [busy, setBusy] = useState(false);

  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setName("");
      setEmail("");
      setLockEmail(false);
      setSendEmail(true);
      setRole("participant");
    }
  }

  const canSave = name.trim().length > 0;
  const willSendEmail = lockEmail && sendEmail && email.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setBusy(true);
    try {
      await onCreated({
        displayName: name.trim(),
        email: lockEmail ? email.trim().toLowerCase() : null,
        role,
        sendEmail: willSendEmail,
      });
    } catch (err) {
      onError(
        err instanceof Error ? err.message : "Failed to create invite.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New invite">
      <div className="space-y-4">
        <TextInput
          label="Display name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Rafi"
          autoFocus
          hint="A participant record will be created with this name."
        />

        <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-purpleDark/70 bg-midnight/40 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={lockEmail}
            onChange={(e) => setLockEmail(e.target.checked)}
            className="accent-peach"
          />
          <span className="text-textPrimary">
            Lock invite to a specific email
          </span>
        </label>

        {lockEmail && (
          <TextInput
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="rafi@example.com"
            hint="Only this email address can redeem the invite."
          />
        )}

        {lockEmail && (
          <label className="flex items-start gap-2 px-3 py-2.5 rounded-lg border border-peach/40 bg-peach/5 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="accent-peach mt-0.5"
            />
            <div>
              <span className="text-textPrimary inline-flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-peach" />
                Send the invite code to this email
              </span>
              <p className="text-[11px] text-textSecondary mt-0.5">
                Sends a personal invite email with the code and a link to the
                app, so you don't have to copy-paste anything.
              </p>
            </div>
          </label>
        )}

        <Select
          label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
        >
          <option value="participant">Participant</option>
          <option value="admin">Administrator</option>
        </Select>

        {role === "admin" && (
          <div className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-xs text-gold">
            Administrators have full access to edit everything. No participant
            record is created for admins.
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            onClick={onClose}
            className="text-sm text-textSecondary hover:text-textPrimary"
          >
            Cancel
          </button>
          <Button onClick={handleSave} disabled={!canSave || busy}>
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : willSendEmail ? (
              <Send className="w-4 h-4" />
            ) : (
              <Ticket className="w-4 h-4" />
            )}
            {willSendEmail ? "Create & send" : "Generate invite"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ShowCodeModal({
  invite,
  emailed,
  onClose,
}: {
  invite: Invite | null;
  emailed: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  if (!invite) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(invite.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="Invite created">
      <div className="space-y-4">
        {emailed && invite.email ? (
          <div className="rounded-xl border border-forest/40 bg-forest/5 p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-forest/15 border border-forest/40 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 text-forest" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-textPrimary font-medium mb-0.5">
                  Invite sent
                </p>
                <p className="text-xs text-textSecondary">
                  Delivered to{" "}
                  <span className="text-textPrimary">{invite.email}</span>.
                  They'll find the code and instructions in the email.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-textSecondary">
            Share this code with{" "}
            <span className="text-textPrimary">{invite.displayName}</span>.
            They will use it on the sign-in page under{" "}
            <span className="text-peach">"Redeem Invite"</span>.
          </p>
        )}

        <div className="rounded-xl border-2 border-dashed border-peach/50 bg-peach/5 p-6 text-center">
          <p className="text-[11px] text-textSecondary uppercase tracking-wider mb-2">
            Invite code
          </p>
          <p className="font-mono text-2xl text-peach tracking-wider">
            {invite.code}
          </p>
        </div>

        <div className="text-xs text-textSecondary space-y-1">
          <p>
            <span className="text-lavenderMist">Name:</span>{" "}
            {invite.displayName}
          </p>
          <p>
            <span className="text-lavenderMist">Role:</span>{" "}
            {invite.role === "admin" ? "Administrator" : "Participant"}
          </p>
          {invite.email && (
            <p>
              <span className="text-lavenderMist">Locked to:</span>{" "}
              {invite.email}
            </p>
          )}
          {invite.participantId && (
            <p className="text-forest">
              A participant record was created and will link automatically
              when redeemed.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            onClick={onClose}
            className="text-sm text-textSecondary hover:text-textPrimary inline-flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" /> Close
          </button>
          <Button onClick={copy}>
            {copied ? (
              <>
                <Check className="w-4 h-4" /> Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> Copy code
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
        }
