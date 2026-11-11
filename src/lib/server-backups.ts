/**
 * Server-side household backups.
 *
 * Each household's backups live inside that household's own SQLite file, in
 * the same encrypted key/value table as the budget itself:
 *   backup_index      JSON list of BackupMeta (newest first)
 *   backup:<id>       the budget JSON at that moment
 *   backup_schedule   "daily" | "weekly" | "monthly" | "yearly" | "never"
 *   backup_last_auto  time of the last automatic backup (ms)
 *
 * Server-only: import from inside server function handlers.
 */
import crypto from "node:crypto";
import { homeKvDelete, homeKvGet, homeKvSet, loadDBValue, saveDBValue } from "./server-db";

export type BackupReason = "manual" | "auto" | "update" | "restore";
export type BackupSchedule = "daily" | "weekly" | "monthly" | "yearly" | "never";

export type BackupMeta = {
  id: string;
  createdAt: number;
  reason: BackupReason;
  size: number;
  by?: string;
};

export const SCHEDULES: BackupSchedule[] = ["daily", "weekly", "monthly", "yearly", "never"];
const DEFAULT_SCHEDULE: BackupSchedule = "weekly";

const DAY = 24 * 60 * 60 * 1000;
const INTERVAL_MS: Record<Exclude<BackupSchedule, "never">, number> = {
  daily: DAY,
  weekly: 7 * DAY,
  monthly: 30 * DAY,
  yearly: 365 * DAY,
};

/** How many of each kind to keep; the oldest beyond this are removed. */
const KEEP: Record<BackupReason, number> = { auto: 12, manual: 20, update: 5, restore: 5 };

function readIndex(homeId: string): BackupMeta[] {
  const raw = homeKvGet(homeId, "backup_index");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeIndex(homeId: string, index: BackupMeta[]): void {
  homeKvSet(homeId, "backup_index", JSON.stringify(index));
}

export function listBackups(homeId: string): BackupMeta[] {
  return readIndex(homeId).sort((a, b) => b.createdAt - a.createdAt);
}

export function getSchedule(homeId: string): BackupSchedule {
  const v = homeKvGet(homeId, "backup_schedule") as BackupSchedule | null;
  return v && SCHEDULES.includes(v) ? v : DEFAULT_SCHEDULE;
}

export function setSchedule(homeId: string, schedule: BackupSchedule): void {
  if (!SCHEDULES.includes(schedule)) throw new Error("Unknown backup schedule");
  homeKvSet(homeId, "backup_schedule", schedule);
}

export function lastAutoBackupAt(homeId: string): number | null {
  const v = Number(homeKvGet(homeId, "backup_last_auto"));
  return Number.isFinite(v) && v > 0 ? v : null;
}

/** Snapshot the household's current budget. Returns null if there's nothing saved yet. */
export function createBackup(homeId: string, reason: BackupReason, by?: string): BackupMeta | null {
  const data = loadDBValue(homeId);
  if (!data) return null;
  const meta: BackupMeta = {
    id: `${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`,
    createdAt: Date.now(),
    reason,
    size: Buffer.byteLength(data, "utf8"),
    ...(by ? { by } : {}),
  };
  homeKvSet(homeId, `backup:${meta.id}`, data);

  // Keep the newest N of this kind, delete the rest.
  const index = [meta, ...readIndex(homeId)];
  const sameKind = index
    .filter((b) => b.reason === reason)
    .sort((a, b) => b.createdAt - a.createdAt);
  const drop = new Set(sameKind.slice(KEEP[reason]).map((b) => b.id));
  for (const id of drop) homeKvDelete(homeId, `backup:${id}`);
  writeIndex(
    homeId,
    index.filter((b) => !drop.has(b.id)),
  );
  if (reason === "auto") homeKvSet(homeId, "backup_last_auto", String(meta.createdAt));
  return meta;
}

/**
 * Called just before a household's budget is saved. If an automatic backup is
 * due, snapshot the current (pre-save) budget first.
 */
export function autoBackupIfDue(homeId: string): void {
  try {
    const schedule = getSchedule(homeId);
    if (schedule === "never") return;
    const last = lastAutoBackupAt(homeId) ?? 0;
    if (Date.now() - last < INTERVAL_MS[schedule]) return;
    createBackup(homeId, "auto");
  } catch {
    // A failed backup must never block saving the user's budget.
  }
}

/** Replace the budget with a backup, after backing up the current state. */
export function restoreBackup(
  homeId: string,
  id: string,
  by?: string,
): { ok: boolean; error?: string } {
  if (!readIndex(homeId).some((b) => b.id === id)) return { ok: false, error: "Backup not found." };
  const data = homeKvGet(homeId, `backup:${id}`);
  if (!data) return { ok: false, error: "That backup is empty or damaged." };
  try {
    JSON.parse(data);
  } catch {
    return { ok: false, error: "That backup is empty or damaged." };
  }
  createBackup(homeId, "restore", by);
  saveDBValue(data, homeId);
  return { ok: true };
}

export function deleteBackup(homeId: string, id: string): void {
  homeKvDelete(homeId, `backup:${id}`);
  writeIndex(
    homeId,
    readIndex(homeId).filter((b) => b.id !== id),
  );
}
