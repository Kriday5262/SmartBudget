import { useEffect, useSyncExternalStore } from "react";
import type { UpdateStatus } from "./server-updates";
import { handleAuthError, useUnlocked } from "./lock";

export type { UpdateStatus };

let status: UpdateStatus | null = null;
let checking = false;
let lastFetch = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Fetch update status. The server only re-asks GitHub once a day unless forced. */
export async function refreshUpdateStatus(force = false): Promise<UpdateStatus | null> {
  if (checking) return status;
  checking = true;
  emit();
  try {
    const { getUpdateStatusApi } = await import("./api");
    status = await getUpdateStatusApi({ data: { force } });
    lastFetch = Date.now();
  } catch (err) {
    handleAuthError(err);
  } finally {
    checking = false;
    emit();
  }
  return status;
}

export async function requestUpdate(): Promise<{ ok: boolean; error?: string; backedUp?: number }> {
  const { requestUpdateApi } = await import("./api");
  const res = await requestUpdateApi().catch((err) => {
    handleAuthError(err);
    return { ok: false, backedUp: 0, error: "Couldn't start the update. Try again." };
  });
  await refreshUpdateStatus();
  return res;
}

/**
 * Update status for the UI. Loads once after sign-in, then again every 6 hours
 * while the app stays open (the server itself checks GitHub at most daily).
 */
export function useUpdateStatus(): { status: UpdateStatus | null; checking: boolean } {
  const unlocked = useUnlocked();
  const snapshot = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
    () => null,
  );
  const isChecking = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => checking,
    () => false,
  );
  useEffect(() => {
    if (!unlocked) return;
    if (Date.now() - lastFetch > 60_000) refreshUpdateStatus();
    const timer = setInterval(() => refreshUpdateStatus(), 6 * 60 * 60 * 1000);
    return () => clearInterval(timer);
  }, [unlocked]);
  return { status: snapshot, checking: isChecking };
}
