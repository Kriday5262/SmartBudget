/**
 * Update check + hand-off to the host updater.
 *
 * The app runs in a Docker container that holds only the built app, so it
 * can't replace itself. Instead:
 *   1. It checks GitHub (at most once a day) for commits newer than the one it
 *      was built from.
 *   2. "Update now" backs up every household, then writes
 *      <DATA_DIR>/updater/request.json.
 *   3. scripts/updater.sh, run by cron on the host every minute, sees the
 *      request, makes a full copy of the data folder, rebuilds, swaps the
 *      container, and rolls back if the new one isn't healthy. It reports
 *      progress in <DATA_DIR>/updater/status.json and proves it's installed by
 *      touching <DATA_DIR>/updater/heartbeat.
 *
 * Server-only: import from inside server function handlers.
 */
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR, homeKvGet, homeKvSet, loadHomesRegistry, loadUsersServer } from "./server-db";
import { createBackup } from "./server-backups";

// Recorded at build time from the git remote; can be overridden at run time.
const REPO = process.env.SMARTBUDGET_UPDATE_REPO || __APP_REPO__;
const BRANCH = process.env.SMARTBUDGET_UPDATE_BRANCH || "main";
const CHECK_EVERY_MS = 24 * 60 * 60 * 1000;
const MIN_FORCED_CHECK_GAP_MS = 60 * 1000;
const UPDATER_DIR = path.join(DATA_DIR, "updater");
/** The updater runs every minute; allow some slack before calling it missing. */
const HEARTBEAT_STALE_MS = 5 * 60 * 1000;

export const CURRENT_VERSION = __APP_VERSION__;
export const CURRENT_COMMIT = __APP_COMMIT__;

export type Change = { sha: string; message: string; date: string };

type CheckResult = {
  checkedAt: number;
  forCommit: string;
  latestCommit: string | null;
  behindBy: number;
  changes: Change[];
  error?: string;
};

export type UpdaterState = {
  installed: boolean;
  state: "idle" | "requested" | "updating" | "done" | "failed";
  message?: string;
  at?: number;
};

export type UpdateStatus = {
  current: { version: string; commit: string };
  latestCommit: string | null;
  updateAvailable: boolean;
  behindBy: number;
  changes: Change[];
  checkedAt: number | null;
  error?: string;
  updater: UpdaterState;
};

function readCache(): CheckResult | null {
  try {
    const raw = homeKvGet("default", "update_check");
    return raw ? (JSON.parse(raw) as CheckResult) : null;
  } catch {
    return null;
  }
}

type GitHubCommit = {
  sha: string;
  commit?: { message?: string; author?: { date?: string }; committer?: { date?: string } };
};

async function github<T>(pathname: string): Promise<T> {
  const res = await fetch(`https://api.github.com/repos/${REPO}${pathname}`, {
    headers: { accept: "application/vnd.github+json", "user-agent": "SmartBudget-updater" },
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 403 || res.status === 429) throw new Error("GitHub is busy. Try again later.");
  if (!res.ok) throw new Error(`GitHub returned ${res.status}`);
  return (await res.json()) as T;
}

function toChange(c: GitHubCommit): Change {
  return {
    sha: String(c.sha),
    message: String(c.commit?.message ?? "")
      .split("\n")[0]
      .slice(0, 140),
    date: String(c.commit?.committer?.date ?? c.commit?.author?.date ?? ""),
  };
}

async function runCheck(): Promise<CheckResult> {
  const base: CheckResult = {
    checkedAt: Date.now(),
    forCommit: CURRENT_COMMIT,
    latestCommit: null,
    behindBy: 0,
    changes: [],
  };
  if (!REPO) {
    base.error = "This build doesn't know which GitHub repository it came from.";
    homeKvSet("default", "update_check", JSON.stringify(base));
    return base;
  }
  try {
    const head = await github<GitHubCommit>(`/commits/${encodeURIComponent(BRANCH)}`);
    base.latestCommit = String(head.sha);
    if (!CURRENT_COMMIT) {
      // Built without git info: we can't tell exactly how far behind we are.
      base.error = "This build doesn't record its version, so it can't compare.";
    } else if (base.latestCommit !== CURRENT_COMMIT) {
      const cmp = await github<{ ahead_by?: number; commits?: GitHubCommit[] }>(
        `/compare/${CURRENT_COMMIT}...${encodeURIComponent(BRANCH)}`,
      );
      base.behindBy = Number(cmp.ahead_by) || 0;
      base.changes = (Array.isArray(cmp.commits) ? cmp.commits : [])
        .map(toChange)
        .reverse()
        .slice(0, 30);
    }
  } catch (err) {
    base.error = err instanceof Error ? err.message : "Couldn't reach GitHub.";
  }
  homeKvSet("default", "update_check", JSON.stringify(base));
  return base;
}

function readJson(file: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function updaterState(): UpdaterState {
  let installed = false;
  try {
    installed =
      Date.now() - fs.statSync(path.join(UPDATER_DIR, "heartbeat")).mtimeMs < HEARTBEAT_STALE_MS;
  } catch {
    // No heartbeat file: the updater was never installed on this server.
  }
  if (fs.existsSync(path.join(UPDATER_DIR, "request.json"))) {
    const req = readJson(path.join(UPDATER_DIR, "request.json"));
    return { installed, state: "requested", at: typeof req?.at === "number" ? req.at : undefined };
  }
  const status = readJson(path.join(UPDATER_DIR, "status.json"));
  const state = status?.state;
  if (state === "updating" || state === "done" || state === "failed") {
    return {
      installed,
      state,
      message: typeof status?.message === "string" ? status.message : undefined,
      at: typeof status?.at === "number" ? status.at : undefined,
    };
  }
  return { installed, state: "idle" };
}

/** Current update status; re-checks GitHub when the cached result is over a day old. */
export async function getUpdateStatus(force = false): Promise<UpdateStatus> {
  let check = readCache();
  const stale =
    !check ||
    check.forCommit !== CURRENT_COMMIT ||
    Date.now() - check.checkedAt > CHECK_EVERY_MS ||
    (force && Date.now() - check.checkedAt > MIN_FORCED_CHECK_GAP_MS);
  if (stale) check = await runCheck();
  return {
    current: { version: CURRENT_VERSION, commit: CURRENT_COMMIT },
    latestCommit: check!.latestCommit,
    updateAvailable: check!.behindBy > 0,
    behindBy: check!.behindBy,
    changes: check!.changes,
    checkedAt: check!.checkedAt,
    error: check!.error,
    updater: updaterState(),
  };
}

/** Back up every household, then ask the host updater to update. */
export function requestUpdate(by: string): { ok: boolean; backedUp: number; error?: string } {
  const state = updaterState();
  if (state.state === "requested" || state.state === "updating") {
    return { ok: false, backedUp: 0, error: "An update is already in progress." };
  }
  const homes = new Set<string>(loadHomesRegistry().map((h) => h.id));
  for (const u of loadUsersServer("default")) for (const h of u.homes ?? []) homes.add(h);
  let backedUp = 0;
  for (const homeId of homes) {
    try {
      if (createBackup(homeId, "update", by)) backedUp++;
    } catch {
      // Keep going: the host updater also copies the whole data folder first.
    }
  }
  fs.mkdirSync(UPDATER_DIR, { recursive: true, mode: 0o700 });
  const tmp = path.join(UPDATER_DIR, "request.json.tmp");
  fs.writeFileSync(
    tmp,
    JSON.stringify({ at: Date.now(), by, fromCommit: CURRENT_COMMIT, branch: BRANCH }),
    { mode: 0o600 },
  );
  fs.renameSync(tmp, path.join(UPDATER_DIR, "request.json"));
  return { ok: true, backedUp };
}
