import * as XLSX from "xlsx";
import type { Expense, ExpenseCategory, ID, Participant } from "./types";

// ============================================================================
// Spreadsheet import — parsing, column mapping, and validation.
// ============================================================================

export type ImportTarget = "expenses" | "participants";

export interface ParsedSheet {
  name: string;
  headers: string[];
  rows: Record<string, string>[];
}

export interface ParsedWorkbook {
  sheetNames: string[];
  sheets: Record<string, ParsedSheet>;
}

export async function parseSpreadsheet(file: File): Promise<ParsedWorkbook> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const sheets: Record<string, ParsedSheet> = {};
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false,
    });
    const headers = json.length > 0 ? Object.keys(json[0]) : [];
    const rows = json.map((r) => {
      const out: Record<string, string> = {};
      for (const h of headers) out[h] = String(r[h] ?? "").trim();
      return out;
    });
    sheets[name] = { name, headers, rows };
  }

  return { sheetNames: workbook.SheetNames, sheets };
}

// ---------------------------------------------------------------------------
// Field definitions
// ---------------------------------------------------------------------------

export interface FieldDef {
  key: string;
  label: string;
  required: boolean;
  hint?: string;
}

export const EXPENSE_FIELDS: FieldDef[] = [
  { key: "description", label: "Description", required: true },
  { key: "amount", label: "Amount (৳)", required: true, hint: "Number" },
  {
    key: "kind",
    label: "Kind",
    required: false,
    hint: "planned / actual — defaults to planned",
  },
  {
    key: "categoryName",
    label: "Category name",
    required: false,
    hint: "Auto-created if new",
  },
  { key: "date", label: "Date", required: false, hint: "YYYY-MM-DD" },
  {
    key: "paidByName",
    label: "Paid by",
    required: false,
    hint: "Participant name or 'pool'",
  },
  { key: "notes", label: "Notes", required: false },
];

export const PARTICIPANT_FIELDS: FieldDef[] = [
  { key: "name", label: "Name", required: true },
  { key: "nickname", label: "Nickname", required: false },
  { key: "photoUrl", label: "Photo URL", required: false },
  { key: "contact", label: "Contact", required: false },
  {
    key: "status",
    label: "Status",
    required: false,
    hint: "confirmed / tentative / cancelled — defaults to confirmed",
  },
  { key: "notes", label: "Notes", required: false },
];

export function fieldsFor(target: ImportTarget): FieldDef[] {
  return target === "expenses" ? EXPENSE_FIELDS : PARTICIPANT_FIELDS;
}

// ---------------------------------------------------------------------------
// Auto column mapping
// ---------------------------------------------------------------------------

const SYNONYMS: Record<string, string[]> = {
  description: ["description", "desc", "item", "expense", "title", "name"],
  amount: ["amount", "cost", "price", "taka", "bdt", "value", "total"],
  kind: ["kind", "type", "planned/actual", "status", "is actual"],
  categoryName: ["category", "cat", "group", "type of expense"],
  date: ["date", "when", "day", "timestamp"],
  paidByName: ["paid by", "payer", "by", "who paid"],
  notes: ["notes", "note", "comment", "remarks"],
  nickname: ["nickname", "short name", "alias"],
  photoUrl: ["photo", "photo url", "image", "avatar", "picture"],
  contact: ["contact", "phone", "email", "mobile"],
  status: ["status", "confirmation", "state"],
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, "");
}

export function autoMapColumns(
  headers: string[],
  target: ImportTarget,
): Record<string, string> {
  const mapping: Record<string, string> = {};
  const used = new Set<string>();

  const fields = fieldsFor(target);

  // Pass 1: exact normalized match
  for (const field of fields) {
    const wanted = normalize(field.label.split(" (")[0]);
    const exact = headers.find((h) => !used.has(h) && normalize(h) === wanted);
    if (exact) {
      mapping[field.key] = exact;
      used.add(exact);
    }
  }

  // Pass 2: synonyms
  for (const field of fields) {
    if (mapping[field.key]) continue;
    const synonyms = SYNONYMS[field.key] ?? [];
    const hit = headers.find(
      (h) =>
        !used.has(h) &&
        synonyms.some((s) => normalize(h).includes(normalize(s))),
    );
    if (hit) {
      mapping[field.key] = hit;
      used.add(hit);
    }
  }

  return mapping;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface RowIssue {
  rowNumber: number; // 1-based, not counting the header
  field?: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidatedRow {
  rowNumber: number;
  data: Record<string, string>;
  warnings: RowIssue[];
}

export interface ValidationResult {
  valid: ValidatedRow[];
  errors: RowIssue[];
  warnings: RowIssue[];
  duplicateRowNumbers: number[];
}

function isValidISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return false;
  const d = new Date(s);
  return Number.isFinite(d.getTime());
}

function parseAmount(s: string): number | null {
  const cleaned = s.replace(/[৳,\s]/g, "").replace(/,/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export function validateRows(
  rows: Record<string, string>[],
  target: ImportTarget,
  mapping: Record<string, string>,
  ctx: {
    participants: Participant[];
    expenses: Expense[];
  },
): ValidationResult {
  const errors: RowIssue[] = [];
  const warnings: RowIssue[] = [];
  const valid: ValidatedRow[] = [];
  const duplicateRowNumbers: number[] = [];

  const nameSet = new Set(
    ctx.participants.map((p) => p.name.trim().toLowerCase()),
  );
  const seenInFile: Record<string, number> = {};

  rows.forEach((raw, i) => {
    const rowNumber = i + 1;
    const rowErrors: RowIssue[] = [];
    const rowWarnings: RowIssue[] = [];

    const get = (field: string): string => {
      const col = mapping[field];
      if (!col) return "";
      return (raw[col] ?? "").trim();
    };

    if (target === "expenses") {
      const description = get("description");
      const amountStr = get("amount");

      if (!description) {
        rowErrors.push({
          rowNumber,
          field: "description",
          message: "Missing description",
          severity: "error",
        });
      }
      if (!amountStr) {
        rowErrors.push({
          rowNumber,
          field: "amount",
          message: "Missing amount",
          severity: "error",
        });
      } else {
        const n = parseAmount(amountStr);
        if (n === null) {
          rowErrors.push({
            rowNumber,
            field: "amount",
            message: `Invalid amount "${amountStr}"`,
            severity: "error",
          });
        } else if (n < 0) {
          rowErrors.push({
            rowNumber,
            field: "amount",
            message: "Amount cannot be negative",
            severity: "error",
          });
        }
      }

      const kind = get("kind").toLowerCase();
      if (kind && kind !== "planned" && kind !== "actual") {
        rowWarnings.push({
          rowNumber,
          field: "kind",
          message: `Unknown kind "${kind}" — using planned`,
          severity: "warning",
        });
      }

      const date = get("date");
      if (date && !isValidISODate(date)) {
        rowWarnings.push({
          rowNumber,
          field: "date",
          message: `Unrecognized date "${date}" — using today`,
          severity: "warning",
        });
      }

      const paidBy = get("paidByName");
      if (paidBy) {
        const low = paidBy.toLowerCase();
        const isPool = low === "pool" || low === "group pool";
        const isKnown = nameSet.has(low);
        if (!isPool && !isKnown) {
          rowWarnings.push({
            rowNumber,
            field: "paidByName",
            message: `"${paidBy}" not found — will be recorded as group pool`,
            severity: "warning",
          });
        }
      }

      // Duplicate detection within the file
      const fp = `${description.toLowerCase()}|${amountStr}|${date}`;
      if (description && amountStr) {
        if (seenInFile[fp] !== undefined) {
          duplicateRowNumbers.push(rowNumber);
          rowWarnings.push({
            rowNumber,
            message: `Possible duplicate of row ${seenInFile[fp]}`,
            severity: "warning",
          });
        } else {
          seenInFile[fp] = rowNumber;
        }
      }
    } else {
      const name = get("name");
      if (!name) {
        rowErrors.push({
          rowNumber,
          field: "name",
          message: "Missing name",
          severity: "error",
        });
      } else {
        const low = name.toLowerCase();
        if (seenInFile[low] !== undefined) {
          duplicateRowNumbers.push(rowNumber);
          rowWarnings.push({
            rowNumber,
            message: `Duplicate name — same as row ${seenInFile[low]}`,
            severity: "warning",
          });
        } else {
          seenInFile[low] = rowNumber;
          if (nameSet.has(low)) {
            rowWarnings.push({
              rowNumber,
              message: `A participant named "${name}" already exists`,
              severity: "warning",
            });
          }
        }
      }
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
    } else {
      valid.push({ rowNumber, data: raw, warnings: rowWarnings });
      warnings.push(...rowWarnings);
    }
  });

  return { valid, errors, warnings, duplicateRowNumbers };
}

// ---------------------------------------------------------------------------
// Payload builders
// ---------------------------------------------------------------------------

export interface BuildContext {
  participants: Participant[];
  categories: ExpenseCategory[];
  onNewCategory: (name: string) => ExpenseCategory;
}

export interface ExpenseImportRow {
  description: string;
  amount: number;
  kind: "planned" | "actual";
  categoryId: ID;
  date: string;
  paidBy: ID | "pool";
  notes: string;
}

export interface ParticipantImportRow {
  name: string;
  nickname: string;
  photoUrl: string;
  contact: string;
  status: "confirmed" | "tentative" | "cancelled";
  notes: string;
}

export function buildExpenseRows(
  rows: ValidatedRow[],
  mapping: Record<string, string>,
  ctx: BuildContext,
): ExpenseImportRow[] {
  const catMap = new Map<string, ExpenseCategory>();
  for (const c of ctx.categories) catMap.set(c.name.toLowerCase(), c);

  const partMap = new Map<string, ID>();
  for (const p of ctx.participants) partMap.set(p.name.toLowerCase(), p.id);

  return rows.map(({ data }) => {
    const get = (k: string) =>
      mapping[k] ? (data[mapping[k]] ?? "").trim() : "";

    const description = get("description");
    const amount = parseAmount(get("amount")) ?? 0;
    const kindRaw = get("kind").toLowerCase();
    const kind: "planned" | "actual" =
      kindRaw === "actual" ? "actual" : "planned";

    const categoryName = get("categoryName") || "Miscellaneous";
    let cat = catMap.get(categoryName.toLowerCase());
    if (!cat) {
      cat = ctx.onNewCategory(categoryName);
      catMap.set(categoryName.toLowerCase(), cat);
    }

    const dateRaw = get("date");
    const date = isValidISODate(dateRaw)
      ? dateRaw.slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    const paidRaw = get("paidByName").toLowerCase();
    let paidBy: ID | "pool" = "pool";
    if (paidRaw && paidRaw !== "pool" && paidRaw !== "group pool") {
      paidBy = partMap.get(paidRaw) ?? "pool";
    }

    return {
      description,
      amount,
      kind,
      categoryId: cat.id,
      date,
      paidBy,
      notes: get("notes"),
    };
  });
}

export function buildParticipantRows(
  rows: ValidatedRow[],
  mapping: Record<string, string>,
): ParticipantImportRow[] {
  return rows.map(({ data }) => {
    const get = (k: string) =>
      mapping[k] ? (data[mapping[k]] ?? "").trim() : "";
    const statusRaw = get("status").toLowerCase();
    const status: ParticipantImportRow["status"] =
      statusRaw === "tentative"
        ? "tentative"
        : statusRaw === "cancelled" || statusRaw === "canceled"
          ? "cancelled"
          : "confirmed";

    return {
      name: get("name"),
      nickname: get("nickname"),
      photoUrl: get("photoUrl"),
      contact: get("contact"),
      status,
      notes: get("notes"),
    };
  });
}
