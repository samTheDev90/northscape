import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Send,
  Link2,
  AlertTriangle,
} from "lucide-react";
import Modal from "./Modal";
import Button from "./PrimaryButton";
import { TextArea, TextInput } from "./FormField";
import { useToast } from "./Toast";
import { useConfirm } from "./ConfirmProvider";
import { buildRecipients, sendOne, sleep } from "../lib/email";
import type { Participant } from "../lib/types";
import type { DirectoryUser } from "../lib/userDirectory";

type SendStatus = "idle" | "sending" | "sent" | "failed";

interface Props {
  open: boolean;
  onClose: () => void;
  participants: Participant[];
  users: DirectoryUser[];
  tripName: string;
  initialParticipantId?: string | null;
}

export default function EmailComposerModal({
  open,
  onClose,
  participants,
  users,
  tripName,
  initialParticipantId,
}: Props) {
  const toast = useToast();
  const confirm = useConfirm();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [statusMap, setStatusMap] = useState<Record<string, SendStatus>>({});
  const [sentSummary, setSentSummary] = useState<{
    sent: number;
    failed: number;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setStatusMap({});
    setSentSummary(null);
    setQuery("");
    setSubject("");
    setMessage("");
    if (initialParticipantId) {
      setSelected(new Set([initialParticipantId]));
    } else {
      setSelected(new Set());
    }
  }, [open, initialParticipantId]);

  const recipients = useMemo(
    () => buildRecipients(participants, users),
    [participants, users],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return recipients;
    const q = query.trim().toLowerCase();
    return recipients.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q),
    );
  }, [recipients, query]);

  const withEmail = useMemo(
    () => recipients.filter((r) => !!r.email),
    [recipients],
  );

  const selectedWithEmail = useMemo(
    () =>
      Array.from(selected).filter((id) => {
        const r = recipients.find((x) => x.participantId === id);
        return !!r?.email;
      }),
    [selected, recipients],
  );

  const toggle = (id: string, hasEmail: boolean) => {
    if (!hasEmail) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(withEmail.map((r) => r.participantId)));
  };
  const selectConfirmed = () => {
    const confirmed = participants.filter((p) => p.status === "confirmed");
    const confirmedIds = new Set(confirmed.map((p) => p.id));
    setSelected(
      new Set(
        withEmail
          .filter((r) => confirmedIds.has(r.participantId))
          .map((r) => r.participantId),
      ),
    );
  };
  const selectNone = () => setSelected(new Set());

  const canSend =
    !sending &&
    selectedWithEmail.length > 0 &&
    subject.trim().length > 0 &&
    message.trim().length > 0;

  const handleSend = async () => {
    if (!canSend) return;

    const ok = await confirm({
      title: `Send to ${selectedWithEmail.length} ${
        selectedWithEmail.length === 1 ? "person" : "people"
      }?`,
      message:
        "Each person receives the same message individually. This uses " +
        selectedWithEmail.length +
        " of your monthly email quota.",
      confirmText: "Send",
    });
    if (!ok) return;

    setSending(true);
    setSentSummary(null);

    const nextStatus: Record<string, SendStatus> = {};
    for (const id of selectedWithEmail) nextStatus[id] = "idle";
    setStatusMap(nextStatus);

    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < selectedWithEmail.length; i++) {
      const id = selectedWithEmail[i];
      const r = recipients.find((x) => x.participantId === id);
      if (!r || !r.email) continue;

      setStatusMap((prev) => ({ ...prev, [id]: "sending" }));

      try {
        await sendOne({
          to_email: r.email,
          to_name: r.name,
          subject: subject.trim(),
          message: message.trim(),
          trip_name: tripName,
        });
        setStatusMap((prev) => ({ ...prev, [id]: "sent" }));
        sentCount++;
      } catch (err) {
        console.error(`Failed to send to ${r.email}:`, err);
        setStatusMap((prev) => ({ ...prev, [id]: "failed" }));
        failedCount++;
      }

      if (i < selectedWithEmail.length - 1) {
        await sleep(1100);
      }
    }

    setSending(false);
    setSentSummary({ sent: sentCount, failed: failedCount });

    if (failedCount === 0) {
      toast.success(
        `${sentCount} email${sentCount === 1 ? "" : "s"} sent`,
        "All delivered",
      );
    } else {
      toast.warning(
        `${sentCount} sent, ${failedCount} failed`,
        "Some emails failed",
      );
    }
  };

  const handleClose = () => {
    if (sending) return;
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Send email" width="lg">
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-textSecondary">
              Recipients ({selectedWithEmail.length} selected of{" "}
              {withEmail.length} with email)
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                disabled={sending}
                className="text-[11px] text-peach hover:text-coral disabled:opacity-50"
              >
                All
              </button>
              <span className="text-textSecondary text-[11px]">·</span>
              <button
                type="button"
                onClick={selectConfirmed}
                disabled={sending}
                className="text-[11px] text-peach hover:text-coral disabled:opacity-50"
              >
                Confirmed only
              </button>
              <span className="text-textSecondary text-[11px]">·</span>
              <button
                type="button"
                onClick={selectNone}
                disabled={sending}
                className="text-[11px] text-textSecondary hover:text-textPrimary disabled:opacity-50"
              >
                None
              </button>
            </div>
          </div>

          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-textSecondary absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search recipients…"
              disabled={sending}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-midnight/60 border border-purpleDark/70 text-textPrimary text-sm focus:outline-none focus:border-peach/60 disabled:opacity-60"
            />
          </div>

          <div className="max-h-64 overflow-y-auto rounded-xl border border-purpleDark/60 bg-midnight/30 divide-y divide-purpleDark/40">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-xs text-textSecondary">
                No participants match.
              </div>
            ) : (
              filtered.map((r) => {
                const isSelected = selected.has(r.participantId);
                const noEmail = !r.email;
                const status = statusMap[r.participantId] ?? "idle";
                return (
                  <label
                    key={r.participantId}
                    className={`flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer ${
                      noEmail
                        ? "opacity-50 cursor-not-allowed"
                        : isSelected
                          ? "bg-peach/5"
                          : "hover:bg-purpleDark/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={noEmail || sending}
                      onChange={() => toggle(r.participantId, !noEmail)}
                      className="accent-peach"
                    />
                    <div className="w-8 h-8 rounded-full bg-purpleDark/60 flex items-center justify-center text-peach text-xs font-serif shrink-0">
                      {r.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-textPrimary truncate">
                        {r.name}
                      </p>
                      <p className="text-[11px] text-textSecondary truncate">
                        {r.email ?? "No email address"}
                      </p>
                    </div>
                    {r.hasLinkedAccount && r.email && (
                      <span
                        className="text-[10px] text-forest shrink-0 inline-flex items-center gap-1"
                        title="Signed-in account"
                      >
                        <Link2 className="w-3 h-3" />
                      </span>
                    )}
                    {status === "sending" && (
                      <Loader2 className="w-4 h-4 text-peach animate-spin shrink-0" />
                    )}
                    {status === "sent" && (
                      <CheckCircle2 className="w-4 h-4 text-forest shrink-0" />
                    )}
                    {status === "failed" && (
                      <XCircle className="w-4 h-4 text-coral shrink-0" />
                    )}
                  </label>
                );
              })
            )}
          </div>
        </div>

        <TextInput
          label="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Trip update — meeting point change"
          disabled={sending}
        />

        <TextArea
          label="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`Write your message here.\n\nThis will be sent to each recipient individually.`}
          className="min-h-[160px]"
          disabled={sending}
        />

        {sentSummary && (
          <div
            className={`rounded-xl border px-4 py-3 text-xs ${
              sentSummary.failed === 0
                ? "border-forest/40 bg-forest/5 text-textPrimary"
                : "border-gold/40 bg-gold/5 text-textPrimary"
            }`}
          >
            <p className="font-medium mb-1">
              {sentSummary.failed === 0
                ? "All emails sent successfully"
                : "Some emails failed"}
            </p>
            <p className="text-textSecondary">
              {sentSummary.sent} delivered
              {sentSummary.failed > 0 &&
                ` · ${sentSummary.failed} failed — retry from the list`}
            </p>
          </div>
        )}

        {!sentSummary && selectedWithEmail.length === 0 && (
          <div className="rounded-xl border border-purpleDark/60 bg-midnight/40 px-4 py-3 text-[11px] text-textSecondary inline-flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              Select at least one recipient. Participants without an email need
              a linked account or an email address in their contact field.
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-purpleDark/40">
          <button
            onClick={handleClose}
            disabled={sending}
            className="text-sm text-textSecondary hover:text-textPrimary disabled:opacity-50"
          >
            {sentSummary ? "Close" : "Cancel"}
          </button>
          <Button onClick={handleSend} disabled={!canSend}>
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send to {selectedWithEmail.length || "0"}
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
