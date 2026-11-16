import { useCallback, useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Plus, Undo2, Redo2, Lock, ChevronDown } from "lucide-react";
import { BankMark } from "./BankMark";
import { CardBrandMark } from "./CardBrandMark";
import { NAV_ITEMS, BottomTabBar } from "./BottomTabBar";
import { AddPopup } from "./AddPopup";
import { EditAccountDialog } from "./EditAccountDialog";
import { EditTransactionDialog } from "./EditTransactionDialog";
import { JoinHomeInvitePopup } from "./JoinHomeInvitePopup";
import { PullToRefresh } from "./PullToRefresh";

import { Toaster } from "@/components/ui/sonner";
import {
  useDB,
  accountBalance,
  initDB,
  refreshDB,
  useUndo,
  undo,
  redo,
  ACCOUNT_TYPES,
  type AccountType,
} from "@/lib/store";
import { money } from "@/lib/format";
import { uiActions } from "@/lib/ui-store";
import { useHydrated } from "@/hooks/use-hydrated";
import { LockScreen } from "./LockScreen";
import { LogoMark } from "./Logo";
import { hydrateLock, hydrateUsers, useUnlocked, lock } from "@/lib/lock";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";
import { todayISO } from "@/lib/format";
import { KeyboardModePanel } from "./KeyboardModePanel";
import { useUpdateStatus } from "@/lib/updates";

const KEYBOARD_MODE_KEY = "smartbudget.keyboard_mode";

export function AppShell({ children }: { children: React.ReactNode }) {
  const db = useDB();
  const hydrated = useHydrated();
  const unlocked = useUnlocked();
  // Also runs the daily update check after sign-in.
  const { status: updateStatus } = useUpdateStatus();
  const { canUndo, canRedo } = useUndo();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [keyboardMode, setKeyboardMode] = useState(false);
  const [keyboardDate, setKeyboardDate] = useState(todayISO());
  useTheme();

  const closeKeyboardMode = useCallback(() => {
    setKeyboardMode(false);
    window.localStorage.setItem(KEYBOARD_MODE_KEY, "0");
  }, []);

  useEffect(() => {
    setKeyboardMode(window.localStorage.getItem(KEYBOARD_MODE_KEY) === "1");
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey && e.shiftKey && e.code === "KeyK") {
        e.preventDefault();
        setKeyboardMode((current) => {
          const next = !current;
          window.localStorage.setItem(KEYBOARD_MODE_KEY, next ? "1" : "0");
          return next;
        });
        return;
      }
      if (keyboardMode) return;

      const target = e.target as HTMLElement | null;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        Boolean(target?.isContentEditable);
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) {
        if (e.shiftKey && e.code === "KeyL" && !isTyping) {
          e.preventDefault();
          uiActions.openAdd("transaction");
        }
        return;
      }
      const k = e.key.toLowerCase();
      if (e.shiftKey && k === "a") {
        e.preventDefault();
        uiActions.openAdd("account");
      } else if (e.shiftKey && k === "c") {
        e.preventDefault();
        uiActions.openAdd("card");
      } else if (e.shiftKey && k === "g") {
        e.preventDefault();
        uiActions.openAdd("goal");
      } else if (k === "l") {
        e.preventDefault();
        uiActions.openAdd("transaction");
      } else if (k === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if (k === "z") {
        e.preventDefault();
        undo();
      } else if (k === "y") {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keyboardMode]);

  useEffect(() => {
    hydrateLock();
    hydrateUsers();
    initDB();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => refreshDB(), 5000);
    return () => clearInterval(interval);
  }, []);

  if (hydrated && !unlocked) return <LockScreen />;

  if (keyboardMode) {
    return (
      <div className="h-screen w-full overflow-hidden bg-background">
        <KeyboardModePanel
          db={db}
          date={keyboardDate}
          onDateChange={setKeyboardDate}
          onClose={closeKeyboardMode}
        />
        <Toaster position="top-center" richColors />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 transition-[width] md:flex",
          "w-64",
        )}
      >
        <Link to="/" className="flex items-center gap-2.5 px-2 py-1">
          <LogoMark className="h-9 w-9 text-logo" />
          <span className="font-display text-[17px] font-bold tracking-tight">SmartBudget</span>
        </Link>

        <div className="mt-4" />

        <nav className="mt-5 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.to ||
              (item.to.startsWith("/accounts") && pathname.startsWith("/accounts"));
            return (
              <Link
                key={item.to}
                to={item.to}
                preload="intent"
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                )}
              >
                <item.icon className="h-[18px] w-[18px]" strokeWidth={2} />
                {item.label}
                {item.to === "/settings" && updateStatus?.updateAvailable && (
                  <span
                    className="ml-auto h-2 w-2 rounded-full bg-primary"
                    aria-label="Update available"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-3" />
        {hydrated ? <SidebarAccounts pathname={pathname} /> : <div className="flex-1" />}

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => uiActions.openAdd("transaction")}
            className="tap flex flex-1 items-center justify-center gap-2 rounded-2xl gradient-primary px-3 py-2.5 text-sm font-bold text-primary-foreground"
          >
            <Plus className="h-4 w-4" strokeWidth={2.6} />
            Add
          </button>
          <button
            onClick={undo}
            disabled={!canUndo}
            aria-label="Undo"
            title="Undo (Ctrl+Z)"
            className="tap rounded-2xl border border-sidebar-border p-2.5 hover:bg-sidebar-accent disabled:opacity-30"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            aria-label="Redo"
            title="Redo (Ctrl+Shift+Z)"
            className="tap rounded-2xl border border-sidebar-border p-2.5 hover:bg-sidebar-accent disabled:opacity-30"
          >
            <Redo2 className="h-4 w-4" />
          </button>
          <button
            onClick={lock}
            aria-label="Lock App"
            title="Lock Session"
            className="tap rounded-2xl border border-sidebar-border p-2.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          >
            <Lock className="h-4 w-4" />
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-10">
        <PullToRefresh>
          <div
            key={pathname}
            className="animate-native-slide mx-auto max-w-5xl px-4 py-5 md:px-8 md:py-8"
          >
            {children}
          </div>
        </PullToRefresh>
      </main>

      <BottomTabBar />
      <AddPopup />
      <EditAccountDialog />
      <EditTransactionDialog />
      <JoinHomeInvitePopup />
      <Toaster position="top-center" richColors />
    </div>
  );
}

const SIDEBAR_COLLAPSED_KEY = "smartbudget.sidebar_collapsed_groups";

/** ₹1,03,830 — whole rupees, so names get the room in the narrow sidebar. */
const inrWhole = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** Accounts grouped by type, with collapsible sections and per-group totals. */
function SidebarAccounts({ pathname }: { pathname: string }) {
  const db = useDB();
  const [collapsed, setCollapsed] = useState<Set<AccountType>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) ?? "[]"));
    } catch {
      return new Set();
    }
  });

  function toggle(type: AccountType) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify([...next]));
      } catch {
        // storage unavailable (private mode) — the toggle still works for this visit
      }
      return next;
    });
  }

  const groups = ACCOUNT_TYPES.map((t) => {
    const accounts = db.accounts
      .filter((a) => a.type === t.id && !a.closed)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((a) => ({ account: a, balance: accountBalance(db, a.id).total }));
    return { ...t, accounts, total: accounts.reduce((s, a) => s + a.balance, 0) };
  }).filter((g) => g.accounts.length > 0);

  return (
    <div
      className={cn(
        "-mx-1 flex-1 overflow-y-auto px-1 pb-3 pt-3 no-scrollbar",
        // soft edges instead of a hard cut where the list scrolls
        "[mask-image:linear-gradient(to_bottom,transparent,black_12px,black_calc(100%-20px),transparent)]",
      )}
    >
      {groups.length === 0 && (
        <Link
          to="/accounts"
          className="mx-1 flex items-center gap-2 rounded-xl border border-dashed border-sidebar-border px-3 py-3 text-xs text-muted-foreground hover:bg-sidebar-accent"
        >
          <Plus className="h-3.5 w-3.5" /> Add your first account
        </Link>
      )}
      <div className="space-y-2">
        {groups.map((g) => {
          const isOpen = !collapsed.has(g.id);
          return (
            <section key={g.id}>
              <button
                type="button"
                onClick={() => toggle(g.id)}
                aria-expanded={isOpen}
                className="group flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-left hover:bg-sidebar-accent"
              >
                <ChevronDown
                  className={cn(
                    "h-3 w-3 shrink-0 text-muted-foreground transition-transform",
                    !isOpen && "-rotate-90",
                  )}
                />
                <span className="flex-1 truncate text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {g.plural}
                </span>
                <span
                  className={cn(
                    "num text-[11px] font-semibold",
                    g.total < 0 ? "text-destructive/80" : "text-muted-foreground",
                  )}
                  title={money(g.total)}
                >
                  {inrWhole.format(g.total)}
                </span>
              </button>

              {isOpen && (
                <ul className="mt-0.5 space-y-px">
                  {g.accounts.map(({ account: a, balance }) => {
                    const active = pathname === `/accounts/${a.id}`;
                    return (
                      <li key={a.id}>
                        <Link
                          to="/accounts/$accountId"
                          params={{ accountId: a.id }}
                          title={`${a.name} · ${money(balance)}`}
                          className={cn(
                            "flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors",
                            active
                              ? balance < 0
                                ? "bg-destructive/10"
                                : "bg-primary/10"
                              : "hover:bg-sidebar-accent",
                          )}
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                            {a.type === "credit" && a.brand ? (
                              <CardBrandMark brand={a.brand} className="h-4 w-6" />
                            ) : (
                              <BankMark bank={a.bank} className="h-[18px] w-[18px]" />
                            )}
                          </span>
                          <span
                            className={cn(
                              "min-w-0 flex-1 truncate text-[13px] font-medium",
                              active
                                ? balance < 0
                                  ? "text-destructive"
                                  : "text-primary"
                                : "text-sidebar-foreground",
                            )}
                          >
                            {a.name}
                          </span>
                          <span
                            className={cn(
                              "num shrink-0 text-xs font-semibold tabular-nums",
                              balance < 0
                                ? "text-destructive"
                                : active
                                  ? "text-primary"
                                  : "text-muted-foreground",
                            )}
                          >
                            {inrWhole.format(balance)}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
