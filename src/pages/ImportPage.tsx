import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  UploadCloud,
  FileSpreadsheet,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  X,
  Users,
  Wallet,
} from "lucide-react";
import { useStore } from "../lib/store";
import { useToast } from "../components/Toast";
import { useConfirm } from "../components/ConfirmProvider";
import {
  autoMapColumns,
  buildExpenseRows,
  buildParticipantRows,
  fieldsFor,
  parseSpreadsheet,
  validateRows,
  type ImportTarget,
  type ParsedWorkbook,
  type ValidatedRow,
} from "../lib/import";
import { formatBDT } from "../lib/money";
import Button from "../components/PrimaryButton";
import { Select } from "../components/FormField";

type Step = "target" | "file" | "map" | "preview" | "done";

export default function ImportPage() {
  const { data, addExpense, addParticipant, addCategory } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("target");
  const [target, setTarget] = useState<ImportTarget | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null);
  const [sheetName, setSheetName] = useState<string>("");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);

  const [importedCount, setImportedCount] = useState(0);

  // Reset downstream state when target changes
  const pickTarget = (t: ImportTarget) => {
    setTarget(t);
    setStep("file");
  };

  const handleFile = async (f: File) => {
    setParsing(true);
    setFile(f);
    try {
      const wb = await parseSpreadsheet(f);
      setWorkbook(wb);
      const first = wb.sheetNames[0];
      setSheetName(first);
      const sheet = wb.sheets[first];
      setMapping(autoMapColumns(sheet.headers, target ?? "expenses"));
      setStep("map");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not read the file.",
        "Import failed",
      );
      setFile(null);
    } finally {
      setParsing(false);
    }
  };

  const handleSheetChange = (name: string) => {
    setSheetName(name);
    if (!workbook || !target) return;
    const sheet = workbook.sheets[name];
    setMapping(autoMapColumns(sheet.headers, target));
  };

  // Validation
  const validation = useMemo(() => {
    if (!workbook || !target || !sheetName) return null;
    const sheet = workbook.sheets[sheetName];
    return validateRows(sheet.rows, target, mapping, {
      participants: data.participants,
      expenses: data.expenses,
    });
  }, [workbook, target, sheetName, mapping, data.participants, data.expenses]);

  const fields = target ? fieldsFor(target) : [];
  const missingRequired = fields.filter((f) => f.required && !mapping[f.key]);

  const handleCommit = async () => {
    if (!validation || !target) return;

    const ok = await confirm({
      title: `Import ${validation.valid.length} row${
        validation.valid.length === 1 ? "" : "s"
      }?`,
      message:
        validation.errors.length > 0
          ? `${validation.errors.length} row${validation.errors.length === 1 ? "" : "s"} will be skipped due to errors.`
          : "Existing data will not be removed — new records will be added.",
      confirmText: "Import",
    });
    if (!ok) return;

    setCommitting(true);
    try {
      if (target === "expenses") {
        const rows = buildExpenseRows(validation.valid, mapping, {
          participants: data.participants,
          categories: data.categories,
          onNewCategory: (name) => addCategory(name),
        });
        for (const r of rows) {
          addExpense({
            description: r.description,
            amount: r.amount,
            plannedAmount: r.kind === "planned" ? r.amount : 0,
            actualAmount: r.kind === "actual" ? r.amount : 0,
            kind: r.kind,
            categoryId: r.categoryId,
            date: r.date,
            paidBy: r.paidBy,
            allocationMethod: "equal",
            eligibleParticipantIds: [],
            notes: r.notes,
            status: r.kind === "actual" ? "paid" : "unpaid",
          });
        }
        setImportedCount(rows.length);
      } else {
        const rows = buildParticipantRows(validation.valid, mapping);
        for (const r of rows) {
          addParticipant({
            name: r.name,
            nickname: r.nickname,
            photoUrl: r.photoUrl,
            contact: r.contact,
            status: r.status,
            notes: r.notes,
          });
        }
        setImportedCount(rows.length);
      }
      toast.success(
        `${validation.valid.length} row${
          validation.valid.length === 1 ? "" : "s"
        } imported`,
        "Import complete",
      );
      setStep("done");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Import failed.",
        "Error",
      );
    } finally {
      setCommitting(false);
    }
  };

  const reset = () => {
    setStep("target");
    setTarget(null);
    setFile(null);
    setWorkbook(null);
    setSheetName("");
    setMapping({});
    setImportedCount(0);
  };

  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-6 py-8 md:py-10">
      <div className="flex items-center gap-3 mb-6 pv-fade-up">
        <button
          onClick={() => navigate("/documents")}
          className="p-2 rounded-lg hover:bg-purpleDark/60 text-textSecondary"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="font-serif text-2xl md:text-3xl text-textPrimary">
            Import spreadsheet
          </h1>
          <p className="text-textSecondary text-sm">
            Upload a CSV or Excel file with expenses or participants.
          </p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1">
        <StepDot
          n={1}
          label="Type"
          active={step === "target"}
          done={step !== "target"}
        />
        <StepSep />
        <StepDot
          n={2}
          label="File"
          active={step === "file"}
          done={["map", "preview", "done"].includes(step)}
        />
        <StepSep />
        <StepDot
          n={3}
          label="Map"
          active={step === "map"}
          done={["preview", "done"].includes(step)}
        />
        <StepSep />
        <StepDot
          n={4}
          label="Preview"
          active={step === "preview"}
          done={step === "done"}
        />
        <StepSep />
        <StepDot n={5} label="Done" active={step === "done"} done={false} />
      </div>

      {/* STEP: TARGET */}
      {step === "target" && (
        <div className="pv-fade-up">
          <h2 className="font-serif text-lg text-textPrimary mb-4">
            What are you importing?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TargetCard
              icon={Wallet}
              title="Expenses"
              description="Descriptions, amounts, dates, categories, and who paid."
              onClick={() => pickTarget("expenses")}
            />
            <TargetCard
              icon={Users}
              title="Participants"
              description="Names, contact details, and status for new travelers."
              onClick={() => pickTarget("participants")}
            />
          </div>
        </div>
      )}

      {/* STEP: FILE */}
      {step === "file" && (
        <div className="pv-fade-up">
          <h2 className="font-serif text-lg text-textPrimary mb-4">
            Upload the file
          </h2>
          <DropZone onFile={handleFile} parsing={parsing} />
          <div className="mt-4 flex gap-2">
            <Button variant="ghost" onClick={reset}>
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </div>
        </div>
      )}

      {/* STEP: MAP */}
      {step === "map" && workbook && target && (
        <div className="pv-fade-up">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-serif text-lg text-textPrimary">
              Match columns
            </h2>
            {workbook.sheetNames.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-textSecondary">Sheet:</span>
                <select
                  value={sheetName}
                  onChange={(e) => handleSheetChange(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-midnight/60 border border-purpleDark/70 text-textPrimary text-sm focus:outline-none focus:border-peach/60"
                >
                  {workbook.sheetNames.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <p className="text-xs text-textSecondary mb-5">
            We auto-detected what we could. Adjust any field below if the
            matching is wrong.
          </p>

          <div className="space-y-3 mb-6">
            {fields.map((f) => (
              <div
                key={f.key}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center rounded-xl border border-purpleDark/60 bg-indigoDeep/70 p-4"
              >
                <div className="md:col-span-5">
                  <p className="text-sm text-textPrimary font-medium">
                    {f.label}
                    {f.required && <span className="text-coral ml-1">*</span>}
                  </p>
                  {f.hint && (
                    <p className="text-[11px] text-textSecondary mt-0.5">
                      {f.hint}
                    </p>
                  )}
                </div>
                <div className="md:col-span-7">
                  <Select
                    label=""
                    value={mapping[f.key] ?? ""}
                    onChange={(e) =>
                      setMapping((prev) => ({
                        ...prev,
                        [f.key]: e.target.value,
                      }))
                    }
                  >
                    <option value="">— Not mapped —</option>
                    {workbook.sheets[sheetName].headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={reset}>
              <ArrowLeft className="w-4 h-4" /> Start over
            </Button>
            <Button
              onClick={() => setStep("preview")}
              disabled={missingRequired.length > 0}
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          {missingRequired.length > 0 && (
            <p className="text-xs text-coral mt-3 text-right">
              Please map: {missingRequired.map((f) => f.label).join(", ")}
            </p>
          )}
        </div>
      )}

      {/* STEP: PREVIEW */}
      {step === "preview" && validation && (
        <PreviewStep
          validation={validation}
          mapping={mapping}
          target={target ?? "expenses"}
          onBack={() => setStep("map")}
          onConfirm={handleCommit}
          committing={committing}
        />
      )}

      {/* STEP: DONE */}
      {step === "done" && (
        <div className="pv-fade-up text-center py-12">
          <div className="w-16 h-16 mx-auto rounded-full bg-forest/15 border border-forest/40 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-forest" />
          </div>
          <h2 className="font-serif text-2xl text-textPrimary mb-2">
            Import complete
          </h2>
          <p className="text-textSecondary text-sm mb-6">
            {importedCount} record{importedCount === 1 ? "" : "s"} added.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="ghost" onClick={reset}>
              Import another file
            </Button>
            <Link
              to={target === "expenses" ? "/budget" : "/participants"}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-peach text-midnight text-sm font-medium hover:bg-coral transition-colors"
            >
              View {target === "expenses" ? "budget" : "participants"}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stepper helpers
// ---------------------------------------------------------------------------

function StepDot({
  n,
  label,
  active,
  done,
}: {
  n: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
          done
            ? "bg-forest/20 text-forest border border-forest/50"
            : active
              ? "bg-peach text-midnight"
              : "bg-indigoDeep border border-purpleDark/60 text-textSecondary"
        }`}
      >
        {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : n}
      </div>
      <span
        className={`text-xs whitespace-nowrap ${
          active ? "text-textPrimary" : "text-textSecondary"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function StepSep() {
  return <div className="w-6 md:w-10 h-px bg-purpleDark/60 shrink-0" />;
}

// ---------------------------------------------------------------------------
// Target picker
// ---------------------------------------------------------------------------

function TargetCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: typeof Users;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-6 hover:border-peach/50 hover:bg-purpleDark/30 transition-colors pv-card group"
    >
      <div className="w-12 h-12 rounded-xl bg-peach/10 border border-peach/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <Icon className="w-5 h-5 text-peach" />
      </div>
      <h3 className="font-serif text-lg text-textPrimary mb-1">{title}</h3>
      <p className="text-xs text-textSecondary leading-relaxed">
        {description}
      </p>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Drop zone
// ---------------------------------------------------------------------------

function DropZone({
  onFile,
  parsing,
}: {
  onFile: (f: File) => void;
  parsing: boolean;
}) {
  const [hover, setHover] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setHover(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) onFile(f);
  };

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={handleDrop}
      className={`block rounded-2xl border-2 border-dashed transition-colors cursor-pointer ${
        hover
          ? "border-peach/60 bg-peach/5"
          : "border-purpleDark/60 bg-indigoDeep/50 hover:border-peach/40"
      }`}
    >
      <input
        type="file"
        accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        onChange={handleChange}
        className="hidden"
      />
      <div className="py-16 px-6 text-center">
        {parsing ? (
          <Loader2 className="w-10 h-10 mx-auto text-peach animate-spin mb-4" />
        ) : (
          <UploadCloud className="w-10 h-10 mx-auto text-peach mb-4" />
        )}
        <p className="font-serif text-lg text-textPrimary mb-1">
          {parsing ? "Reading file…" : "Drop a file, or click to browse"}
        </p>
        <p className="text-xs text-textSecondary">
          CSV, XLSX, or XLS — up to 10 MB
        </p>
      </div>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Preview step
// ---------------------------------------------------------------------------

function PreviewStep({
  validation,
  mapping,
  target,
  onBack,
  onConfirm,
  committing,
}: {
  validation: ReturnType<typeof validateRows>;
  mapping: Record<string, string>;
  target: ImportTarget;
  onBack: () => void;
  onConfirm: () => void;
  committing: boolean;
}) {
  const fields = fieldsFor(target);
  const shownFields = fields.filter((f) => mapping[f.key]);

  const previewRows = validation.valid.slice(0, 20);

  const hasBlockers = validation.errors.length > 0;

  return (
    <div className="pv-fade-up">
      <h2 className="font-serif text-lg text-textPrimary mb-5">
        Preview & confirm
      </h2>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <SummaryCard
          value={String(validation.valid.length)}
          label="Ready"
          accent="forest"
        />
        <SummaryCard
          value={String(validation.errors.length)}
          label="Errors"
          accent={validation.errors.length > 0 ? "coral" : "muted"}
        />
        <SummaryCard
          value={String(validation.warnings.length)}
          label="Warnings"
          accent={validation.warnings.length > 0 ? "gold" : "muted"}
        />
        <SummaryCard
          value={String(validation.duplicateRowNumbers.length)}
          label="Duplicates"
          accent={validation.duplicateRowNumbers.length > 0 ? "coral" : "muted"}
        />
      </div>

      {/* Issues list */}
      {(validation.errors.length > 0 || validation.warnings.length > 0) && (
        <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-purpleDark/60">
            <p className="text-sm text-textPrimary font-medium">Issues found</p>
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-purpleDark/40">
            {[...validation.errors, ...validation.warnings].map((iss, i) => (
              <div
                key={i}
                className="px-5 py-2.5 flex items-start gap-3 text-xs"
              >
                {iss.severity === "error" ? (
                  <XCircle className="w-3.5 h-3.5 text-coral shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-gold shrink-0 mt-0.5" />
                )}
                <span className="text-textSecondary">
                  <span className="text-textPrimary font-medium">
                    Row {iss.rowNumber}:
                  </span>{" "}
                  {iss.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview table */}
      <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-purpleDark/60 flex items-center justify-between">
          <p className="text-sm text-textPrimary font-medium">
            First {previewRows.length} valid row
            {previewRows.length === 1 ? "" : "s"}
          </p>
          {validation.valid.length > previewRows.length && (
            <span className="text-[11px] text-textSecondary">
              +{validation.valid.length - previewRows.length} more
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-midnight/40 text-textSecondary">
                <th className="px-3 py-2 text-left font-normal">Row</th>
                {shownFields.map((f) => (
                  <th
                    key={f.key}
                    className="px-3 py-2 text-left font-normal whitespace-nowrap"
                  >
                    {f.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-purpleDark/30">
              {previewRows.map((row) => (
                <tr key={row.rowNumber} className="text-textPrimary">
                  <td className="px-3 py-2 text-textSecondary">
                    {row.rowNumber}
                  </td>
                  {shownFields.map((f) => (
                    <td
                      key={f.key}
                      className="px-3 py-2 whitespace-nowrap max-w-[200px] truncate"
                      title={row.data[mapping[f.key]]}
                    >
                      {row.data[mapping[f.key]] || (
                        <span className="text-textSecondary">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" /> Back to mapping
        </Button>
        <Button
          onClick={onConfirm}
          disabled={committing || validation.valid.length === 0}
        >
          {committing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Importing…
            </>
          ) : (
            <>
              Import {validation.valid.length} row
              {validation.valid.length === 1 ? "" : "s"}
              <CheckCircle2 className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>

      {hasBlockers && (
        <p className="text-xs text-coral mt-3 text-right">
          {validation.errors.length} row
          {validation.errors.length === 1 ? "" : "s"} with errors will be
          skipped.
        </p>
      )}
    </div>
  );
}

function SummaryCard({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent: "forest" | "coral" | "gold" | "muted";
}) {
  const colors = {
    forest: "text-forest",
    coral: "text-coral",
    gold: "text-gold",
    muted: "text-textPrimary",
  };
  return (
    <div className="rounded-xl border border-purpleDark/60 bg-indigoDeep/70 p-4">
      <p className={`text-2xl font-semibold ${colors[accent]}`}>{value}</p>
      <p className="text-[11px] text-textSecondary mt-1">{label}</p>
    </div>
  );
}
