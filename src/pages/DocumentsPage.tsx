import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  FolderOpen,
  Upload,
  Download,
  Trash2,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FileJson,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { useStore } from "../lib/store";
import { useToast } from "../components/Toast";
import { useConfirm } from "../components/ConfirmProvider";
import {
  BACKUP_SCHEMA_VERSION,
  createBackup,
  downloadJSON,
  downloadText,
  formatBytes,
  parseBackup,
} from "../lib/backup";
import { computeTripTotals } from "../lib/finance";
import Button from "../components/PrimaryButton";
import EmptyState from "../components/EmptyState";
import { Select, TextArea, TextInput } from "../components/FormField";
import Modal from "../components/Modal";
import Reveal from "../components/Reveal";
import { getBlob } from "../lib/db";
import type { Attachment, AttachmentCategory } from "../lib/types";

const CATEGORY_LABELS: Record<AttachmentCategory, string> = {
  "train-ticket": "Train ticket",
  budget: "Budget",
  accommodation: "Accommodation",
  transport: "Transport",
  itinerary: "Itinerary",
  destination: "Destination",
  receipt: "Receipt",
  photo: "Photo",
  misc: "Misc",
};

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

function iconFor(mime: string) {
  if (mime.startsWith("image/")) return ImageIcon;
  if (
    mime.includes("spreadsheet") ||
    mime.includes("csv") ||
    mime.includes("excel")
  )
    return FileSpreadsheet;
  if (mime.includes("json")) return FileJson;
  return FileText;
}

export default function DocumentsPage() {
  const {
    data,
    addAttachment,
    removeAttachment,
    exportBackup,
    importBackup,
    resetAll,
  } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [uploading, setUploading] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [uploadMeta, setUploadMeta] = useState<{
    file: File;
    title: string;
    category: AttachmentCategory;
    notes: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const grouped = useMemo(() => {
    const map = new Map<AttachmentCategory, Attachment[]>();
    for (const a of data.attachments) {
      if (!map.has(a.category)) map.set(a.category, []);
      map.get(a.category)!.push(a);
    }
    return map;
  }, [data.attachments]);

  const handleFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_SIZE_BYTES) {
      toast.error(
        `File is ${formatBytes(file.size)} — maximum allowed is ${formatBytes(
          MAX_SIZE_BYTES,
        )}.`,
        "File too large",
      );
      return;
    }
    setUploadMeta({
      file,
      title: file.name,
      category: file.type.startsWith("image/") ? "photo" : "misc",
      notes: "",
    });
  };

  const confirmUpload = async () => {
    if (!uploadMeta) return;
    setUploading(true);
    try {
      await addAttachment({
        title: uploadMeta.title.trim() || uploadMeta.file.name,
        category: uploadMeta.category,
        fileName: uploadMeta.file.name,
        mimeType: uploadMeta.file.type || "application/octet-stream",
        sizeBytes: uploadMeta.file.size,
        blob: uploadMeta.file,
        notes: uploadMeta.notes,
      });
      toast.success(`${uploadMeta.file.name} uploaded`, "File added");
      setUploadMeta(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Upload failed. Please try again.",
        "Upload error",
      );
    } finally {
      setUploading(false);
    }
  };

  const downloadAttachment = async (a: Attachment) => {
    const blob = await getBlob(a.blobId);
    if (!blob) {
      toast.error(
        `Attachment "${a.title}" could not be found in local storage.`,
        "Not found",
      );
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = a.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleBackupDownload = () => {
    const envelope = createBackup(exportBackup());
    const name = `northscape-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    downloadJSON(envelope, name);
    toast.success("Backup file downloaded", "Saved locally");
  };

  const handleBudgetCSV = () => {
    const totals = computeTripTotals(data);
    const lines: string[] = [];
    lines.push("Northscape — Budget Export");
    lines.push(`Exported,${new Date().toISOString()}`);
    lines.push("");
    lines.push("Summary");
    lines.push("Planned expense," + totals.plannedExpenseTotal);
    lines.push("Actual expense," + totals.actualExpenseTotal);
    lines.push("Contributions received," + totals.actualContributions);
    lines.push("Outstanding contributions," + totals.outstandingContributions);
    lines.push("Cash balance," + totals.groupCashBalance);
    lines.push("Emergency reserve target," + totals.emergencyReserveTarget);
    lines.push("");
    lines.push("Expenses");
    lines.push(
      ["Date", "Description", "Category", "Kind", "Planned", "Actual", "PaidBy"]
        .map(escapeCSV)
        .join(","),
    );
    for (const e of data.expenses) {
      const cat =
        data.categories.find((c) => c.id === e.categoryId)?.name ?? "";
      const payer =
        e.paidBy === "pool"
          ? "Group pool"
          : (data.participants.find((p) => p.id === e.paidBy)?.name ?? "");
      lines.push(
        [
          e.date,
          e.description,
          cat,
          e.kind,
          String(e.plannedAmount || e.amount || 0),
          String(e.actualAmount || 0),
          payer,
        ]
          .map(escapeCSV)
          .join(","),
      );
    }
    lines.push("");
    lines.push("Contributions");
    lines.push(
      ["Participant", "Planned", "Actual", "Date", "Notes"]
        .map(escapeCSV)
        .join(","),
    );
    for (const c of data.contributions) {
      const name =
        data.participants.find((p) => p.id === c.participantId)?.name ?? "";
      lines.push(
        [name, String(c.plannedAmount), String(c.actualAmount), c.date, c.notes]
          .map(escapeCSV)
          .join(","),
      );
    }
    const fname = `northscape-budget-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    downloadText(lines.join("\n"), fname, "text/csv");
    toast.success("Budget CSV downloaded", "Saved locally");
  };

  const handleRestoreFileChosen = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      parseBackup(text);
      setRestoreFile(file);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Invalid backup file.",
        "Restore failed",
      );
    }
  };

  const confirmRestore = async () => {
    if (!restoreFile) return;
    const ok = await confirm({
      title: "Restore from backup?",
      message:
        "Current trip data will be replaced by the backup's contents. This affects all devices.",
      confirmText: "Restore",
      danger: true,
    });
    if (!ok) return;
    try {
      const text = await restoreFile.text();
      const parsed = parseBackup(text);
      importBackup(parsed);
      setRestoreFile(null);
      toast.success("Trip data restored from backup", "Restore complete");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Restore failed.",
        "Restore failed",
      );
    }
  };

  const handleResetAll = async () => {
    const ok = await confirm({
      title: "Reset all trip data?",
      message:
        "This erases all participants, expenses, itinerary, destinations, and settings, restoring the sample state. Cannot be undone.",
      confirmText: "Reset everything",
      danger: true,
    });
    if (!ok) return;
    await resetAll();
    toast.info("Trip data reset to sample state", "Reset complete");
  };

  const handleRemoveAttachment = async (a: Attachment) => {
    const ok = await confirm({
      title: `Remove "${a.title}"?`,
      message: "This file will be permanently deleted from your browser.",
      confirmText: "Remove",
      danger: true,
    });
    if (!ok) return;
    await removeAttachment(a.id);
    toast.success("Attachment removed", "Deleted");
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6 pv-fade-up">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl text-textPrimary mb-1">
            Documents
          </h1>
          <p className="text-textSecondary text-sm">
            Attach tickets, receipts, and notes. Back up or restore the trip.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/import"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigoDeep border border-purpleDark/70 text-textPrimary hover:bg-purpleDark/60 transition-colors"
          >
            <Upload className="w-4 h-4" /> Import spreadsheet
          </Link>
          <Button variant="secondary" onClick={handleBudgetCSV}>
            <FileSpreadsheet className="w-4 h-4" /> Budget CSV
          </Button>
          <Button variant="secondary" onClick={handleBackupDownload}>
            <Download className="w-4 h-4" /> Download backup
          </Button>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4" /> Upload file
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChosen}
          />
        </div>
      </div>

      <Reveal>
        <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-5 mb-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-lg text-textPrimary mb-1">
                Restore from backup
              </h2>
              <p className="text-xs text-textSecondary max-w-md">
                Restoring replaces the trip data on all devices with the
                backup's contents. Verify the file first, then confirm.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => restoreInputRef.current?.click()}
              >
                <Upload className="w-4 h-4" /> Choose file
              </Button>
              <input
                ref={restoreInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={handleRestoreFileChosen}
              />
              <Button variant="danger" onClick={handleResetAll}>
                <RotateCcw className="w-4 h-4" /> Reset all
              </Button>
            </div>
          </div>

          {restoreFile && (
            <div className="mt-4 rounded-xl border border-peach/40 bg-peach/5 p-4 pv-fade-up">
              <p className="text-sm text-textPrimary mb-2">
                Ready to restore:{" "}
                <span className="text-peach">{restoreFile.name}</span> (
                {formatBytes(restoreFile.size)})
              </p>
              <p className="text-xs text-textSecondary mb-3">
                Current data will be replaced. This is safe to undo — you can
                always re-upload your most recent backup.
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setRestoreFile(null)}>
                  Cancel
                </Button>
                <Button onClick={confirmRestore}>Confirm restore</Button>
              </div>
            </div>
          )}
        </div>
      </Reveal>

      <div className="mb-4 flex items-center gap-2">
        <FolderOpen className="w-4 h-4 text-peach" />
        <h2 className="font-serif text-xl text-textPrimary">
          Attached files ({data.attachments.length})
        </h2>
      </div>

      {data.attachments.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No documents attached"
          description="Upload tickets, booking confirmations, receipts, or photos. Files stay local in your browser."
          action={
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4" /> Upload first file
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-xs uppercase tracking-wider text-textSecondary mb-3">
                {CATEGORY_LABELS[category]} ({items.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((a, i) => (
                  <Reveal key={a.id} delay={Math.min(i * 0.05, 0.3)}>
                    <AttachmentCard
                      attachment={a}
                      onDownload={() => downloadAttachment(a)}
                      onRemove={() => handleRemoveAttachment(a)}
                    />
                  </Reveal>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={uploadMeta !== null}
        onClose={() => setUploadMeta(null)}
        title="Add attachment"
      >
        {uploadMeta && (
          <div className="space-y-4">
            <div className="rounded-xl border border-purpleDark/60 bg-midnight/40 px-4 py-3 text-sm">
              <p className="text-textPrimary truncate">
                {uploadMeta.file.name}
              </p>
              <p className="text-xs text-textSecondary mt-0.5">
                {uploadMeta.file.type || "unknown type"} ·{" "}
                {formatBytes(uploadMeta.file.size)}
              </p>
            </div>

            <TextInput
              label="Title"
              value={uploadMeta.title}
              onChange={(e) =>
                setUploadMeta({ ...uploadMeta, title: e.target.value })
              }
            />

            <Select
              label="Category"
              value={uploadMeta.category}
              onChange={(e) =>
                setUploadMeta({
                  ...uploadMeta,
                  category: e.target.value as AttachmentCategory,
                })
              }
            >
              {(Object.keys(CATEGORY_LABELS) as AttachmentCategory[]).map(
                (c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ),
              )}
            </Select>

            <TextArea
              label="Notes (optional)"
              value={uploadMeta.notes}
              onChange={(e) =>
                setUploadMeta({ ...uploadMeta, notes: e.target.value })
              }
              placeholder="Anything worth remembering about this file…"
            />

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => setUploadMeta(null)}
                className="text-sm text-textSecondary hover:text-textPrimary"
              >
                Cancel
              </button>
              <Button onClick={confirmUpload} disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" /> Add attachment
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <p className="mt-10 text-[11px] text-lavenderMist text-center">
        Attachments are stored locally in your browser's IndexedDB. Backups
        include structured trip data but not raw file blobs. Download important
        files separately. Schema v{BACKUP_SCHEMA_VERSION}.
      </p>
    </div>
  );
}

function AttachmentCard({
  attachment: a,
  onDownload,
  onRemove,
}: {
  attachment: Attachment;
  onDownload: () => void;
  onRemove: () => void;
}) {
  const Icon = iconFor(a.mimeType);
  const isImage = a.mimeType.startsWith("image/");

  return (
    <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 overflow-hidden hover:border-peach/40 transition-colors pv-card h-full flex flex-col">
      {isImage && <ImagePreview attachment={a} />}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start gap-3 mb-3">
          {!isImage && (
            <div className="w-10 h-10 rounded-lg bg-purpleDark/60 flex items-center justify-center text-peach shrink-0">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm text-textPrimary truncate" title={a.title}>
              {a.title}
            </p>
            <p className="text-[11px] text-textSecondary truncate">
              {a.fileName}
            </p>
            <p className="text-[10px] text-lavenderMist mt-0.5">
              {formatBytes(a.sizeBytes)} · {a.date}
            </p>
          </div>
        </div>
        {a.notes && (
          <p className="text-[11px] text-textSecondary mb-3 line-clamp-2">
            {a.notes}
          </p>
        )}
        <div className="flex items-center gap-2 mt-auto">
          <button
            onClick={onDownload}
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-purpleDark/60 hover:bg-purpleDark text-textPrimary transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Download
          </button>
          <button
            onClick={onRemove}
            className="p-2 rounded-lg hover:bg-coral/20 text-coral"
            aria-label="Remove"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ImagePreview({ attachment: a }: { attachment: Attachment }) {
  const [url, setUrl] = useState<string | null>(null);

  useMemo(() => {
    let cancelled = false;
    (async () => {
      const blob = await getBlob(a.blobId);
      if (cancelled || !blob) return;
      setUrl(URL.createObjectURL(blob));
    })();
    return () => {
      cancelled = true;
    };
  }, [a.blobId]);

  return (
    <div className="relative h-40 bg-midnight/40 overflow-hidden">
      {url ? (
        <img src={url} alt={a.title} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-lavenderMist" />
        </div>
      )}
    </div>
  );
}

function escapeCSV(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
