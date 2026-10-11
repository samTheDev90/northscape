import type { AppData } from "./types";

export const BACKUP_SCHEMA_VERSION = 1;

// New app id. Old backups used "panchagarh-voyage" — we still accept them.
export const APP_ID = "northscape";
const LEGACY_APP_IDS = ["panchagarh-voyage"];

export interface BackupEnvelope {
  app: string;
  schemaVersion: number;
  exportedAt: string;
  data: AppData;
}

export function createBackup(data: AppData): BackupEnvelope {
  return {
    app: APP_ID,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function downloadJSON(obj: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadText(
  text: string,
  filename: string,
  mime = "text/plain",
): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseBackup(text: string): AppData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("File is not valid JSON.");
  }

  if (typeof parsed !== "object" || parsed === null || !("app" in parsed)) {
    throw new Error("This file is not a Northscape backup.");
  }

  const env = parsed as BackupEnvelope;
  const acceptable = [APP_ID, ...LEGACY_APP_IDS];
  if (!acceptable.includes(env.app)) {
    throw new Error("This file is not a Northscape backup.");
  }

  if (env.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported backup schema version ${env.schemaVersion}. Expected ${BACKUP_SCHEMA_VERSION}.`,
    );
  }
  if (!env.data || typeof env.data !== "object") {
    throw new Error("Backup is missing its data payload.");
  }
  return env.data;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
