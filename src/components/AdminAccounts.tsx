import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Copy, Check, Ticket, X, Loader2 } from "lucide-react";
import { useAuth } from "../lib/auth";
import { createInvite, deleteInvite, subscribeInvites } from "../lib/invites";
import type { Invite, UserRole } from "../lib/types";
import Button from "./PrimaryButton";
import { Select, TextInput } from "./FormField";
import Modal from "./Modal";

export default function AdminAccounts() {
  const { user } = useAuth();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] = useState<Invite | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeInvites(setInvites);
  }, []);

  const { active, used } = useMemo(() => {
    const a: Invite[] = [];
    const u: Invite[] = [];
    for (const i of invites) (i.used ? u : a).push(i);
    return { active: a, used: u };
  }, [invites]);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Create section */}
      <section className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="font-serif text-lg text-textPrimary mb-1 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-peach" />
              Invite participants
            </h2>
            <p className="text-xs text-textSecondary max-w-md">
              Generate an invite code, send it to the person. They choose their
              own password — you never need to see it.
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
            No invites yet. Click "New invite" to add your first participant.
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
                onDelete={async () => {
                  if (confirm(`Delete invite ${i.code}?`)) {
                    await deleteInvite(i.code);
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
                onDelete={async () => {
                  if (confirm(`Delete used invite ${i.code}?`)) {
                    await deleteInvite(i.code);
                  }
                }}
              />
            ))}
          </div>
        )}
      </section>

      <InviteModal
        open={creating}
        onClose={() => setCreating(false)}
        createdBy={user?.id ?? ""}
        onCreated={(invite) => {
          setCreating(false);
          setJustCreated(invite);
          setError(null);
        }}
        onError={(msg) => {
          setError(msg);
        }}
      />

      <ShowCodeModal
        invite={justCreated}
        onClose={() => setJustCreated(null)}
      />
    </div>
  );
}

function InviteRow({
  invite,
  onDelete,
}: {
  invite: Invite;
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
  createdBy,
  onCreated,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  createdBy: string;
  onCreated: (invite: Invite) => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [lockEmail, setLockEmail] = useState(false);
  const [role, setRole] = useState<UserRole>("participant");
  const [busy, setBusy] = useState(false);

  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setName("");
      setEmail("");
      setLockEmail(false);
      setRole("participant");
    }
  }

  const canSave = name.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setBusy(true);
    try {
      const invite = await createInvite({
        displayName: name,
        email: lockEmail ? email : null,
        role,
        createdBy,
      });
      onCreated(invite);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to create invite.");
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
            Administrators have full access to edit everything.
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
            ) : (
              <Ticket className="w-4 h-4" />
            )}
            Generate invite
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ShowCodeModal({
  invite,
  onClose,
}: {
  invite: Invite | null;
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
        <p className="text-sm text-textSecondary">
          Share this code with{" "}
          <span className="text-textPrimary">{invite.displayName}</span>. They
          will use it on the sign-in page under{" "}
          <span className="text-peach">"Redeem Invite"</span>.
        </p>

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
