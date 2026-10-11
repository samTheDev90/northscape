import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Users,
  Pencil,
  Trash2,
  Wallet,
  Phone,
  Mail,
  CheckCircle2,
  Clock,
  XCircle,
  UserCircle2,
  Eye,
  Link2,
  Link2Off,
  Shield,
} from "lucide-react";
import { useStore } from "../lib/store";
import { useAuth } from "../lib/auth";
import { useToast } from "../components/Toast";
import { useConfirm } from "../components/ConfirmProvider";
import { computeParticipantBalances } from "../lib/finance";
import { formatBDT } from "../lib/money";
import Modal from "../components/Modal";
import Button from "../components/PrimaryButton";
import AdminOnly from "../components/AdminOnly";
import ImageUpload from "../components/ImageUpload";
import LinkUserModal from "../components/LinkUserModal";
import { Select, TextArea, TextInput } from "../components/FormField";
import EmptyState from "../components/EmptyState";
import { Skeleton, SkeletonGrid, SkeletonStats } from "../components/Skeleton";
import { subscribeUsers, type DirectoryUser } from "../lib/userDirectory";
import type { Participant, ParticipantStatus } from "../lib/types";

const STATUS_META: Record<
  ParticipantStatus,
  { label: string; color: string; icon: typeof CheckCircle2 }
> = {
  confirmed: {
    label: "Confirmed",
    color: "bg-forest/20 text-forest border-forest/40",
    icon: CheckCircle2,
  },
  tentative: {
    label: "Tentative",
    color: "bg-gold/20 text-gold border-gold/40",
    icon: Clock,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-coral/20 text-coral border-coral/40",
    icon: XCircle,
  },
};

export default function ParticipantsPage() {
  const { data, ready, addParticipant, updateParticipant, removeParticipant } =
    useStore();
  const { isAdmin, isAuthenticated } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Participant | null>(null);
  const [contributingFor, setContributingFor] = useState<Participant | null>(
    null,
  );
  const [linkingFor, setLinkingFor] = useState<Participant | null>(null);
  const [users, setUsers] = useState<DirectoryUser[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      setUsers([]);
      return;
    }
    const unsub = subscribeUsers(setUsers);
    return () => unsub();
  }, [isAuthenticated]);

  const userByParticipant = useMemo(() => {
    const map: Record<string, DirectoryUser> = {};
    for (const u of users) {
      if (u.participantId) map[u.participantId] = u;
    }
    return map;
  }, [users]);

  const balances = useMemo(
    () =>
      computeParticipantBalances(
        data.participants,
        data.contributions,
        data.expenses,
      ),
    [data.participants, data.contributions, data.expenses],
  );

  const balanceMap = useMemo(
    () => Object.fromEntries(balances.map((b) => [b.participantId, b])),
    [balances],
  );

  const contributionsMap = useMemo(() => {
    const map: Record<string, { planned: number; actual: number }> = {};
    for (const c of data.contributions) {
      const rec = map[c.participantId] ?? { planned: 0, actual: 0 };
      rec.planned += c.plannedAmount || 0;
      rec.actual += c.actualAmount || 0;
      map[c.participantId] = rec;
    }
    return map;
  }, [data.contributions]);

  const totals = useMemo(() => {
    let planned = 0;
    let actual = 0;
    for (const v of Object.values(contributionsMap)) {
      planned += v.planned;
      actual += v.actual;
    }
    return { planned, actual };
  }, [contributionsMap]);

  const handleRemove = async (p: Participant) => {
    const linkedUser = userByParticipant[p.id];
    const message = linkedUser
      ? `${linkedUser.displayName}'s account will be unlinked from this participant record. Their contribution records will also be removed.`
      : "Their contribution record will also be removed. Financial history for shared expenses is preserved for the remaining participants.";
    const ok = await confirm({
      title: `Remove ${p.name}?`,
      message,
      confirmText: "Remove",
      danger: true,
    });
    if (ok) {
      removeParticipant(p.id);
      toast.success(`${p.name} removed`, "Participant removed");
    }
  };

  if (!ready) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 md:py-10">
        <Skeleton className="h-8 w-56 mb-3" />
        <Skeleton className="h-3 w-72 mb-6" />
        <SkeletonStats />
        <div className="mt-6">
          <SkeletonGrid count={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6 pv-fade-up">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl text-textPrimary mb-1">
            Participants
          </h1>
          <p className="text-textSecondary text-sm">
            Travelers, contributions, and settlement balances.
          </p>
        </div>
        <AdminOnly>
          <Button onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4" /> Add Participant
          </Button>
        </AdminOnly>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat
          label="Confirmed"
          value={String(
            data.participants.filter((p) => p.status === "confirmed").length,
          )}
        />
        <Stat
          label="Linked accounts"
          value={String(Object.keys(userByParticipant).length)}
          accent="peach"
        />
        <Stat label="Contributions planned" value={formatBDT(totals.planned)} />
        <Stat
          label="Contributions received"
          value={formatBDT(totals.actual)}
          accent="peach"
        />
      </div>

      {data.participants.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No participants yet"
          description={
            isAdmin
              ? "Add your travel companions to start tracking contributions."
              : "The organizer hasn't added participants yet."
          }
          action={
            isAdmin ? (
              <Button onClick={() => setCreating(true)}>
                <Plus className="w-4 h-4" /> Add first participant
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.participants.map((p, i) => {
            const meta = STATUS_META[p.status];
            const Icon = meta.icon;
            const contrib = contributionsMap[p.id] ?? { planned: 0, actual: 0 };
            const bal = balanceMap[p.id];
            const linkedUser = userByParticipant[p.id];
            const isMe = linkedUser?.uid === undefined ? false : false;
            void isMe;
            return (
              <div
                key={p.id}
                className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-5 transition-colors pv-card pv-fade-up relative"
                style={{ animationDelay: `${Math.min(i * 0.06, 0.4)}s` }}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <Link
                    to={`/participants/${p.id}`}
                    className="flex items-center gap-3 min-w-0 flex-1 group"
                  >
                    <div className="w-12 h-12 rounded-full bg-purpleDark/70 flex items-center justify-center overflow-hidden shrink-0 border-2 border-peach/20 group-hover:border-peach/60 transition-colors">
                      {p.photoUrl || linkedUser?.photoUrl ? (
                        <img
                          src={p.photoUrl || linkedUser?.photoUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-peach font-serif text-lg">
                          {p.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-textPrimary font-medium truncate group-hover:text-peach transition-colors">
                        {p.name}
                      </p>
                      {p.nickname && (
                        <p className="text-[11px] text-textSecondary truncate">
                          “{p.nickname}”
                        </p>
                      )}
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border mt-1 ${meta.color}`}
                      >
                        <Icon className="w-3 h-3" />
                        {meta.label}
                      </span>
                    </div>
                  </Link>

                  <AdminOnly>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditing(p)}
                        className="p-1.5 rounded hover:bg-purpleDark/60 text-textSecondary"
                        aria-label="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemove(p)}
                        className="p-1.5 rounded hover:bg-coral/20 text-coral"
                        aria-label="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </AdminOnly>
                </div>

                {/* Link status */}
                <div className="mb-4">
                  {linkedUser ? (
                    <div className="rounded-xl border border-forest/30 bg-forest/5 px-3 py-2">
                      <p className="text-[10px] text-forest uppercase tracking-wider mb-1 inline-flex items-center gap-1">
                        <Link2 className="w-3 h-3" /> Linked account
                      </p>
                      <p className="text-xs text-textPrimary truncate">
                        {linkedUser.displayName}
                      </p>
                      <p className="text-[10px] text-textSecondary truncate">
                        {linkedUser.email}
                      </p>
                      {isAdmin && (
                        <button
                          onClick={() => setLinkingFor(p)}
                          className="mt-2 text-[11px] text-peach hover:text-coral"
                        >
                          Change link
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-purpleDark/60 bg-midnight/40 px-3 py-2">
                      <p className="text-[10px] text-textSecondary uppercase tracking-wider inline-flex items-center gap-1">
                        <Link2Off className="w-3 h-3" /> Not linked
                      </p>
                      <p className="text-[10px] text-lavenderMist mt-0.5">
                        No signed-up account is attached to this person yet.
                      </p>
                      {isAdmin && (
                        <button
                          onClick={() => setLinkingFor(p)}
                          className="mt-2 text-[11px] text-peach hover:text-coral"
                        >
                          Link an account
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-xs mb-4">
                  <Row
                    label="Contribution planned"
                    value={formatBDT(contrib.planned)}
                  />
                  <Row
                    label="Contribution paid"
                    value={formatBDT(contrib.actual)}
                  />
                  <Row
                    label="Outstanding"
                    value={formatBDT(
                      Math.max(0, contrib.planned - contrib.actual),
                    )}
                    accent={
                      contrib.planned > contrib.actual ? "coral" : undefined
                    }
                  />
                </div>

                {bal && bal.owed > 0 && (
                  <div className="pt-3 mb-4 border-t border-purpleDark/40 text-xs">
                    <Row label="Expense share" value={formatBDT(bal.owed)} />
                    <Row
                      label="Balance"
                      value={
                        bal.state === "settled"
                          ? "Settled"
                          : `${bal.state === "receives" ? "+" : "-"}${formatBDT(
                              Math.abs(bal.net),
                            )}`
                      }
                      accent={
                        bal.state === "owes"
                          ? "coral"
                          : bal.state === "receives"
                            ? "forest"
                            : undefined
                      }
                    />
                  </div>
                )}

                {(p.contact || p.notes) && (
                  <div className="pt-3 mb-4 border-t border-purpleDark/40 text-xs text-textSecondary space-y-1">
                    {p.contact && (
                      <p className="inline-flex items-center gap-1.5">
                        <Phone className="w-3 h-3" />
                        {p.contact}
                      </p>
                    )}
                    {p.notes && <p className="line-clamp-2">{p.notes}</p>}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Link
                    to={`/participants/${p.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-purpleDark/60 hover:bg-purpleDark text-textPrimary transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> View profile
                  </Link>
                  <AdminOnly>
                    <Button
                      variant="secondary"
                      onClick={() => setContributingFor(p)}
                    >
                      <Wallet className="w-4 h-4" />
                    </Button>
                  </AdminOnly>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AdminOnly>
        <>
          <ParticipantModal
            open={creating}
            onClose={() => setCreating(false)}
            onSave={(payload) => {
              const created = addParticipant(payload);
              setCreating(false);
              toast.success(
                `${created.name} added to the trip`,
                "Participant added",
              );
            }}
          />
          <ParticipantModal
            open={editing !== null}
            onClose={() => setEditing(null)}
            initial={editing ?? undefined}
            onSave={(payload) => {
              if (editing) updateParticipant(editing.id, payload);
              setEditing(null);
              toast.success("Participant updated", "Saved");
            }}
          />
          <ContributionModal
            open={contributingFor !== null}
            onClose={() => setContributingFor(null)}
            participant={contributingFor}
          />
          <LinkUserModal
            open={linkingFor !== null}
            onClose={() => setLinkingFor(null)}
            participant={linkingFor}
            users={users}
          />
        </>
      </AdminOnly>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "peach";
}) {
  return (
    <div className="rounded-xl border border-purpleDark/60 bg-indigoDeep/70 p-4 pv-card">
      <p className="text-[11px] text-textSecondary mb-1">{label}</p>
      <p
        className={`text-lg font-semibold ${
          accent === "peach" ? "text-peach" : "text-textPrimary"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "coral" | "forest";
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-textSecondary">{label}</span>
      <span
        className={`font-medium ${
          accent === "coral"
            ? "text-coral"
            : accent === "forest"
              ? "text-forest"
              : "text-textPrimary"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

interface ParticipantPayload {
  name: string;
  nickname: string;
  photoUrl: string;
  contact: string;
  status: ParticipantStatus;
  notes: string;
}

function ParticipantModal({
  open,
  onClose,
  initial,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Participant;
  onSave: (payload: ParticipantPayload) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [nickname, setNickname] = useState(initial?.nickname ?? "");
  const [photoUrl, setPhotoUrl] = useState(initial?.photoUrl ?? "");
  const [contact, setContact] = useState(initial?.contact ?? "");
  const [status, setStatus] = useState<ParticipantStatus>(
    initial?.status ?? "confirmed",
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const [lastId, setLastId] = useState<string | null>(initial?.id ?? null);
  if (open && (initial?.id ?? null) !== lastId) {
    setLastId(initial?.id ?? null);
    setName(initial?.name ?? "");
    setNickname(initial?.nickname ?? "");
    setPhotoUrl(initial?.photoUrl ?? "");
    setContact(initial?.contact ?? "");
    setStatus(initial?.status ?? "confirmed");
    setNotes(initial?.notes ?? "");
  }

  const canSave = name.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      nickname: nickname.trim(),
      photoUrl: photoUrl.trim(),
      contact: contact.trim(),
      status,
      notes: notes.trim(),
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Edit Participant" : "New Participant"}
    >
      <div className="space-y-4">
        <ImageUpload
          label="Photo"
          value={photoUrl}
          onChange={setPhotoUrl}
          aspectClass="aspect-square"
          hint="A square image works best. Uploaded to Cloudinary."
        />

        <TextInput
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          autoFocus
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TextInput
            label="Nickname (optional)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Short name"
          />
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ParticipantStatus)}
          >
            <option value="confirmed">Confirmed</option>
            <option value="tentative">Tentative</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>

        <TextInput
          label="Contact (optional)"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Phone or email"
        />

        <TextArea
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <p className="text-[11px] text-lavenderMist">
          Tip: after saving, use "Link an account" on the participant card to
          connect this person to a signed-up user.
        </p>

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            onClick={onClose}
            className="text-sm text-textSecondary hover:text-textPrimary"
          >
            Cancel
          </button>
          <Button onClick={handleSave} disabled={!canSave}>
            <UserCircle2 className="w-4 h-4" />
            {initial ? "Save changes" : "Add participant"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ContributionModal({
  open,
  onClose,
  participant,
}: {
  open: boolean;
  onClose: () => void;
  participant: Participant | null;
}) {
  const { data, upsertContribution } = useStore();
  const toast = useToast();
  const existing = useMemo(
    () =>
      participant
        ? data.contributions.find((c) => c.participantId === participant.id)
        : undefined,
    [data.contributions, participant],
  );

  const [planned, setPlanned] = useState(existing?.plannedAmount ?? 0);
  const [actual, setActual] = useState(existing?.actualAmount ?? 0);
  const [date, setDate] = useState(
    existing?.date ?? new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");

  const [lastId, setLastId] = useState<string | null>(participant?.id ?? null);
  if (open && (participant?.id ?? null) !== lastId) {
    setLastId(participant?.id ?? null);
    setPlanned(existing?.plannedAmount ?? 0);
    setActual(existing?.actualAmount ?? 0);
    setDate(existing?.date ?? new Date().toISOString().slice(0, 10));
    setNotes(existing?.notes ?? "");
  }

  if (!participant) return null;

  const outstanding = Math.max(0, planned - actual);

  const handleSave = () => {
    upsertContribution({
      participantId: participant.id,
      plannedAmount: Math.max(0, Math.round(planned)),
      actualAmount: Math.max(0, Math.round(actual)),
      date,
      notes,
    });
    toast.success(`Contribution saved for ${participant.name}`, "Recorded");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Contribution — ${participant.name}`}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TextInput
            label="Planned contribution (৳)"
            type="number"
            min={0}
            value={planned}
            onChange={(e) => setPlanned(Number(e.target.value) || 0)}
          />
          <TextInput
            label="Actual paid (৳)"
            type="number"
            min={0}
            value={actual}
            onChange={(e) => setActual(Number(e.target.value) || 0)}
          />
        </div>

        <div className="rounded-xl border border-purpleDark/60 bg-midnight/40 px-4 py-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-textSecondary">Outstanding</span>
            <span className={outstanding > 0 ? "text-coral" : "text-forest"}>
              {formatBDT(outstanding)}
            </span>
          </div>
        </div>

        <TextInput
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <TextArea
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            onClick={onClose}
            className="text-sm text-textSecondary hover:text-textPrimary"
          >
            Cancel
          </button>
          <Button onClick={handleSave}>
            <Mail className="w-4 h-4" /> Save contribution
          </Button>
        </div>
      </div>
    </Modal>
  );
}
