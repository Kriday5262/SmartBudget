import { useSyncExternalStore } from "react";
import { getActiveUser, getCurrentHomeId } from "./lock";

/**
 * The guided tour with Penny. Progress is kept per person and household in
 * this browser, so each member gets their own tour and a reload resumes it.
 */
type GuideState = { active: boolean; step: number };

const listeners = new Set<() => void>();
let state: GuideState = { active: false, step: 0 };
let loadedFor = "";

function key(): string {
  return `smartbudget.guide.${getActiveUser()?.username ?? "anon"}.${getCurrentHomeId()}`;
}

function read(): GuideState {
  if (typeof window === "undefined") return { active: false, step: 0 };
  try {
    const raw = localStorage.getItem(key());
    if (!raw || raw === "done") return { active: false, step: 0 };
    const step = Number(raw);
    return Number.isFinite(step) ? { active: true, step } : { active: false, step: 0 };
  } catch {
    return { active: false, step: 0 };
  }
}

function write(next: GuideState | "done") {
  try {
    localStorage.setItem(key(), next === "done" ? "done" : String(next.step));
  } catch {
    // storage unavailable: the tour still runs for this visit
  }
}

function emit(next: GuideState) {
  state = next;
  listeners.forEach((l) => l());
}

function snapshot(): GuideState {
  // Re-read when the person or household changes.
  const k = typeof window === "undefined" ? "" : key();
  if (k !== loadedFor) {
    loadedFor = k;
    state = read();
  }
  return state;
}

export function useGuide(): GuideState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    snapshot,
    () => ({ active: false, step: 0 }),
  );
}

export function startGuide() {
  const next = { active: true, step: 0 };
  write(next);
  emit(next);
}

export function setGuideStep(step: number) {
  const next = { active: true, step };
  write(next);
  emit(next);
}

export function endGuide() {
  write("done");
  emit({ active: false, step: 0 });
}
