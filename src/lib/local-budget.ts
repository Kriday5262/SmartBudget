import type { DB } from "./store";

/**
 * Encrypted on-device copy of a budget. Logout keeps this vault so the next
 * sign-in can merge it with the server without inserting duplicate records.
 */

const KEY_STORE = "smartbudget.vault.key";
const DATA_STORE = "smartbudget.vault.data";

export type SyncStats = {
  hadLocal: boolean;
  /** Records that already existed on the server, so they were not inserted again. */
  duplicates: number;
  /** Records that existed only on this device and were uploaded. */
  uploaded: number;
  /** Records that existed only on the server and were kept. */
  downloaded: number;
  /** Same id on both sides, but this device had newer content. */
  updated: number;
};

type VaultMap = Record<string, { savedAt: string; db: DB }>;

const ID_LISTS = [
  "accounts",
  "categoryGroups",
  "categories",
  "payees",
  "transactions",
  "goals",
  "splits",
  "loans",
  "households",
] as const;

type IdListKey = (typeof ID_LISTS)[number];

function slotKey(username: string, homeId: string) {
  return `${username.trim().toLowerCase()}::${homeId}`;
}

function bytesToB64(bytes: Uint8Array) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function b64ToBytes(b64: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function vaultKey(): Promise<CryptoKey> {
  const existing = localStorage.getItem(KEY_STORE);
  if (existing) {
    return crypto.subtle.importKey("jwk", JSON.parse(existing), { name: "AES-GCM" }, true, [
      "encrypt",
      "decrypt",
    ]);
  }
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
  localStorage.setItem(KEY_STORE, JSON.stringify(await crypto.subtle.exportKey("jwk", key)));
  return key;
}

async function readVault(): Promise<VaultMap> {
  if (typeof window === "undefined") return {};
  const payload = localStorage.getItem(DATA_STORE);
  if (!payload) return {};
  try {
    const [ivB64, dataB64] = payload.split(".");
    if (!ivB64 || !dataB64) return {};
    const key = await vaultKey();
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: b64ToBytes(ivB64) },
      key,
      b64ToBytes(dataB64),
    );
    const parsed = JSON.parse(new TextDecoder().decode(plain));
    if (parsed && typeof parsed === "object") return parsed as VaultMap;
  } catch {
    return {};
  }
  return {};
}

async function writeVault(map: VaultMap): Promise<void> {
  if (typeof window === "undefined") return;
  const key = await vaultKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(map));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  localStorage.setItem(DATA_STORE, `${bytesToB64(iv)}.${bytesToB64(new Uint8Array(cipher))}`);
}

let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function saveLocalBudget(username: string, homeId: string, db: DB): Promise<void> {
  if (typeof window === "undefined" || !username || !homeId) return Promise.resolve();
  const snapshot = JSON.parse(JSON.stringify(db)) as DB;
  return enqueue(async () => {
    const map = await readVault();
    map[slotKey(username, homeId)] = { savedAt: new Date().toISOString(), db: snapshot };
    await writeVault(map);
  });
}

export function loadLocalBudget(username: string, homeId: string): Promise<DB | null> {
  if (typeof window === "undefined" || !username || !homeId) return Promise.resolve(null);
  return enqueue(async () => {
    const map = await readVault();
    const entry = map[slotKey(username, homeId)];
    if (!entry?.db || !Array.isArray(entry.db.accounts)) return null;
    return entry.db;
  });
}

export function clearLocalBudgetsForUser(username: string): Promise<void> {
  if (typeof window === "undefined" || !username) return Promise.resolve();
  const prefix = `${username.trim().toLowerCase()}::`;
  return enqueue(async () => {
    const map = await readVault();
    let changed = false;
    for (const key of Object.keys(map)) {
      if (key.startsWith(prefix)) {
        delete map[key];
        changed = true;
      }
    }
    if (changed) await writeVault(map);
  });
}

type WithId = { id: string };

function unionById<T extends WithId>(local: T[] | undefined, remote: T[] | undefined) {
  const remoteArr = remote ?? [];
  const localArr = local ?? [];
  const localIds = new Set(localArr.map((item) => item.id));
  const merged = new Map<string, T>();
  for (const item of remoteArr) merged.set(item.id, item);
  let duplicates = 0;
  let uploaded = 0;
  let updated = 0;
  for (const item of localArr) {
    const prev = merged.get(item.id);
    if (!prev) {
      merged.set(item.id, item);
      uploaded += 1;
      continue;
    }
    duplicates += 1;
    if (JSON.stringify(prev) !== JSON.stringify(item)) {
      merged.set(item.id, item);
      updated += 1;
    }
  }
  return {
    items: [...merged.values()],
    duplicates,
    uploaded,
    updated,
    downloaded: remoteArr.filter((item) => !localIds.has(item.id)).length,
  };
}

/**
 * Combine a device copy with the server copy. Same ids are kept once.
 * Monthly budgets also match on category + month so a re-created row is not doubled.
 */
export function mergeBudgets(local: DB, remote: DB): { db: DB; stats: SyncStats } {
  const db = JSON.parse(JSON.stringify(remote)) as DB;
  const stats: SyncStats = {
    hadLocal: true,
    duplicates: 0,
    uploaded: 0,
    downloaded: 0,
    updated: 0,
  };

  for (const key of ID_LISTS) {
    const merged = unionById(
      local[key] as WithId[] | undefined,
      remote[key] as WithId[] | undefined,
    );
    (db as DB & Record<IdListKey, WithId[]>)[key] = merged.items as never;
    stats.duplicates += merged.duplicates;
    stats.uploaded += merged.uploaded;
    stats.downloaded += merged.downloaded;
    stats.updated += merged.updated;
  }

  const remoteBudgets = remote.monthlyBudgets ?? [];
  const localBudgets = local.monthlyBudgets ?? [];
  const bySlot = new Map<string, (typeof remoteBudgets)[number]>();
  for (const item of remoteBudgets) bySlot.set(`${item.categoryId}:${item.month}`, item);
  const remoteSlots = new Set(bySlot.keys());
  for (const item of localBudgets) {
    const slot = `${item.categoryId}:${item.month}`;
    const prev = bySlot.get(slot);
    if (!prev) {
      bySlot.set(slot, item);
      stats.uploaded += 1;
      continue;
    }
    stats.duplicates += 1;
    if (JSON.stringify(prev) !== JSON.stringify(item)) {
      bySlot.set(slot, item);
      stats.updated += 1;
    }
  }
  db.monthlyBudgets = [...bySlot.values()];
  const localSlots = new Set(localBudgets.map((item) => `${item.categoryId}:${item.month}`));
  stats.downloaded += [...remoteSlots].filter((slot) => !localSlots.has(slot)).length;

  const remoteSettings = remote.settings ?? {};
  const localSettings = local.settings ?? {};
  db.settings = { ...remoteSettings, ...localSettings };
  for (const key of Object.keys(localSettings)) {
    if (!(key in remoteSettings)) stats.uploaded += 1;
    else if (localSettings[key] !== remoteSettings[key]) stats.updated += 1;
    else stats.duplicates += 1;
  }
  for (const key of Object.keys(remoteSettings)) {
    if (!(key in localSettings)) stats.downloaded += 1;
  }

  db.activeHomeId = remote.activeHomeId || local.activeHomeId;
  return { db, stats };
}

export function describeSync(stats: SyncStats | null | undefined): string | null {
  if (!stats?.hadLocal) return null;
  if (stats.uploaded === 0 && stats.downloaded === 0 && stats.updated === 0) {
    return "Signed in. Nothing new to sync.";
  }
  const parts: string[] = [];
  if (stats.uploaded) parts.push(`${stats.uploaded} new from this device`);
  if (stats.updated) parts.push(`${stats.updated} updated from this device`);
  if (stats.downloaded) parts.push(`${stats.downloaded} from your account`);
  const dup =
    stats.duplicates > 0
      ? ` Skipped ${stats.duplicates} duplicate${stats.duplicates === 1 ? "" : "s"}.`
      : "";
  return `Signed in. Synced ${parts.join(" and ")}.${dup}`;
}
