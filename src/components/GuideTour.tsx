import { useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Minus, Plus, X } from "lucide-react";
import { Mascot } from "./Mascot";
import { FilledButton } from "./MaterialList";
import { useDB, addCategoryGroup, addCategory, setBudget, type DB } from "@/lib/store";
import { monthKey, currencySymbol, money } from "@/lib/format";
import { useGuide, setGuideStep, endGuide } from "@/lib/guide";
import { uiActions, useUI } from "@/lib/ui-store";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/** What a step can look at to decide it's done. */
type Ctx = { db: DB; fabOpen: boolean; pulled: boolean };

type Gesture = "swipe-up" | "swipe-down" | "pull";

type Step = {
  id: string;
  /** only on phones, or only on bigger screens */
  only?: "mobile" | "desktop";
  /** page to show while this step is on */
  route?: string;
  say: (c: Ctx) => string;
  /** said once the step's task is done, before moving on */
  praise?: string;
  done?: (c: Ctx) => boolean;
  /** main button: does the task, or just moves on when there's no task */
  cta?: { label: string; run?: () => void };
  form?: "category" | "budget";
  /** data-tour id of the control to spotlight and zoom */
  target?: string;
  /** an animated finger showing a swipe on the target (or the screen) */
  gesture?: Gesture;
  /** move Penny to the top so she doesn't cover the gesture */
  top?: boolean;
};

const firstCategory = (db: DB) => db.categories.find((c) => !c.hidden);

const ALL_STEPS: Step[] = [
  {
    id: "hello",
    say: () =>
      "Hi, I'm Penny! I'll help you set up your budget, one step at a time. It only takes a couple of minutes.",
    cta: { label: "Let's go" },
  },
  {
    id: "account",
    route: "/accounts/",
    say: () =>
      "First, add an account. That's where your money lives: a bank account, a card, or the cash in your wallet. Put in what's in it right now.",
    cta: { label: "Add account", run: () => uiActions.openAdd("account") },
    done: (c) => c.db.accounts.length > 0,
    praise: "Nice! Your first account is in. You can see it on the Accounts page.",
  },
  {
    id: "category",
    route: "/budget",
    say: () =>
      "Now make a category: something you spend on, like groceries or rent. Pick one below or type your own.",
    form: "category",
    done: (c) => !!firstCategory(c.db),
    praise: "Great! Categories are the envelopes your money goes into.",
  },
  {
    id: "budget",
    route: "/budget",
    say: (c) =>
      `How much do you want to set aside for ${firstCategory(c.db)?.name ?? "it"} this month? That gives your money a job.`,
    form: "budget",
    target: "ready",
    done: (c) => c.db.monthlyBudgets.some((b) => b.month === monthKey() && b.budgeted > 0),
    praise: "Done! Up here, Ready to Assign shows what's still waiting for a job.",
  },
  {
    id: "transaction",
    only: "desktop",
    route: "/",
    say: () =>
      "Spent something today? Use the Add button to log your first transaction. Tip: on a keyboard, Shift plus L adds one from anywhere.",
    cta: { label: "Add transaction", run: () => uiActions.openAdd("transaction") },
    target: "add",
    done: (c) => c.db.transactions.length > 0,
    praise: "You logged your first transaction! Your balances and budget update by themselves.",
  },
  {
    id: "transaction",
    only: "mobile",
    route: "/",
    say: () =>
      "Spent something today? Tap the plus button at the bottom to log your first transaction.",
    target: "add",
    top: true,
    done: (c) => c.db.transactions.length > 0,
    praise: "You logged your first transaction! Your balances and budget update by themselves.",
  },
  {
    id: "swipe-up",
    only: "mobile",
    route: "/",
    say: () =>
      "Here's a handy trick. Swipe up on the plus button, or hold it, to open more pages like Pay and Reports.",
    target: "add",
    gesture: "swipe-up",
    top: true,
    done: (c) => c.fabOpen,
    praise: "That's it! That's where the rest of the app lives.",
  },
  {
    id: "swipe-down",
    only: "mobile",
    say: () => "Now swipe the sheet down to close it.",
    target: "more-sheet",
    gesture: "swipe-down",
    top: true,
    done: (c) => !c.fabOpen,
    praise: "Perfect, you've got it.",
  },
  {
    id: "pull",
    only: "mobile",
    route: "/",
    say: () =>
      "One more: pull down from the top of any page to refresh it, so you see your family's changes straight away.",
    gesture: "pull",
    top: true,
    cta: { label: "Got it" },
    done: (c) => c.pulled,
    praise: "Nice pull! Everything's up to date.",
  },
  {
    id: "pay",
    route: "/pay",
    say: () =>
      "This is Pay. Split a bill with friends or family, and I'll work out who owes whom, with UPI links to settle up.",
    target: "nav/pay",
    cta: { label: "Next" },
  },
  {
    id: "reports",
    route: "/reports",
    say: () => "And Reports shows where your money goes, month by month.",
    target: "nav/reports",
    cta: { label: "Next" },
  },
  {
    id: "end",
    say: () => "That's the tour! You're all set. Happy budgeting!",
    cta: { label: "Finish" },
  },
];

/** Penny in the corner, talking you through the app. */
export function GuideTour() {
  const { active, step } = useGuide();
  const db = useDB();
  const { fabOpen } = useUI();
  const mobile = useIsMobile();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [talking, setTalking] = useState(false);
  const [minimised, setMinimised] = useState(false);
  const [praising, setPraising] = useState(false);
  const [shown, setShown] = useState("");
  const [pulled, setPulled] = useState(false);

  const STEPS = ALL_STEPS.filter((x) => !x.only || (x.only === "mobile") === mobile);
  const s = STEPS[Math.min(step, STEPS.length - 1)];
  const ctx: Ctx = { db, fabOpen, pulled };
  const isDone = !!s.done?.(ctx);
  const line = praising && s.praise ? s.praise : s.say(ctx);

  // Notice a pull-to-refresh (taught on phones).
  useEffect(() => {
    const onPull = () => setPulled(true);
    window.addEventListener("smartbudget:pulled", onPull);
    return () => window.removeEventListener("smartbudget:pulled", onPull);
  }, []);
  useEffect(() => setPulled(false), [step]);

  // Go to the step's page.
  useEffect(() => {
    if (!active || !s.route) return;
    const target = s.route.replace(/\/$/, "") || "/";
    const here = pathname.replace(/\/$/, "") || "/";
    if (here !== target) navigate({ to: s.route });
    // only when the step changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, step]);

  // Was this step's task already done when we got here? Then skip it quietly.
  const doneOnArrival = useRef<{ step: number; done: boolean }>({ step: -1, done: false });
  if (doneOnArrival.current.step !== step) doneOnArrival.current = { step, done: isDone };

  // A task that just got done: praise, then move on.
  useEffect(() => {
    if (!active || !isDone || praising) return;
    const quiet = doneOnArrival.current.done || !s.praise;
    if (!quiet) setPraising(true);
    const t = setTimeout(
      () => {
        setPraising(false);
        setGuideStep(step + 1);
      },
      quiet ? 250 : 4200,
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, isDone, step]);

  // Type out each new line; Penny's mouth moves while it types.
  useEffect(() => {
    if (!active || minimised) return;
    setShown("");
    setTalking(true);
    let i = 0;
    const type = setInterval(() => {
      i += 2;
      setShown(line.slice(0, i));
      if (i >= line.length) {
        clearInterval(type);
        setTalking(false);
      }
    }, 22);
    return () => {
      clearInterval(type);
      setTalking(false);
    };
  }, [active, line, minimised]);

  if (!active) return null;

  if (minimised) {
    return (
      <button
        type="button"
        onClick={() => setMinimised(false)}
        aria-label="Open Penny's tour"
        className="sb-penny-in fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-4 z-[60] rounded-full md:bottom-6 md:right-6"
      >
        <Mascot size={58} />
      </button>
    );
  }

  const next = () => {
    if (step >= STEPS.length - 1) {
      endGuide();
      return;
    }
    setGuideStep(step + 1);
  };

  return (
    <>
      {!praising && (s.target || s.gesture) && (
        <Spotlight key={s.id} target={s.target} gesture={s.gesture} />
      )}
      <aside
        aria-label="Guided tour"
        aria-live="polite"
        className={cn(
          "sb-penny-in fixed inset-x-3 z-[60] md:inset-x-auto md:bottom-6 md:right-6 md:w-[400px]",
          s.top && mobile
            ? "top-[calc(0.75rem+env(safe-area-inset-top))]"
            : "bottom-[calc(5.5rem+env(safe-area-inset-bottom))]",
        )}
      >
        <div className="flex items-end gap-2">
          <Mascot size={64} talking={talking} happy={praising} className="mb-1 shrink-0" />
          <div className="relative min-w-0 flex-1 rounded-[28px] rounded-bl-md bg-card p-4 shadow-xl ring-1 ring-border">
            <div className="mb-1 flex items-center gap-1">
              <p className="flex-1 text-xs font-semibold text-primary">
                Penny · {Math.min(step + 1, STEPS.length)} of {STEPS.length}
              </p>
              <button
                type="button"
                onClick={() => {
                  setMinimised(true);
                }}
                aria-label="Minimise"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  endGuide();
                }}
                aria-label="End the tour"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="min-h-[3.75rem] text-[15px] leading-snug">
              {shown}
              <span className="sr-only">{line}</span>
            </p>

            {!praising && s.form === "category" && <CategoryQuickAdd db={db} />}
            {!praising && s.form === "budget" && <BudgetQuickSet db={db} />}

            {!praising && (
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex gap-1" aria-hidden>
                  {STEPS.map((x, k) => (
                    <span
                      key={x.id}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        k === step
                          ? "w-4 bg-primary"
                          : k < step
                            ? "w-1.5 bg-primary/50"
                            : "w-1.5 bg-muted",
                      )}
                    />
                  ))}
                </div>
                <div className="flex gap-1">
                  {s.done && (
                    <FilledButton variant="text" className="h-9 px-3" onClick={next}>
                      Skip
                    </FilledButton>
                  )}
                  {s.cta && (
                    <FilledButton
                      className="h-9 whitespace-nowrap px-4"
                      onClick={() => (s.cta?.run ? s.cta.run() : next())}
                    >
                      {s.cta.label}
                    </FilledButton>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

const CATEGORY_IDEAS = ["Groceries", "Rent", "Eating out", "Transport", "Bills"];

function CategoryQuickAdd({ db }: { db: DB }) {
  const [name, setName] = useState("");
  const create = (n: string) => {
    const clean = n.trim();
    if (!clean) return;
    const groupId =
      [...db.categoryGroups].sort((a, b) => a.sortOrder - b.sortOrder).find((g) => !g.hidden)?.id ??
      addCategoryGroup("Everyday");
    addCategory(groupId, clean);
  };
  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {CATEGORY_IDEAS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => create(c)}
            className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          >
            {c}
          </button>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          create(name);
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Or type a category"
          aria-label="Category name"
          className="h-10 min-w-0 flex-1 rounded-full border border-border bg-background/60 px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="submit"
          aria-label="Add category"
          disabled={!name.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

function BudgetQuickSet({ db }: { db: DB }) {
  const cat = firstCategory(db);
  const [amount, setAmount] = useState("");
  if (!cat) return null;
  const value = Number(amount);
  return (
    <form
      className="mt-3 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (value > 0) setBudget(cat.id, monthKey(), value);
      }}
    >
      <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-background/60 px-4 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <span className="text-sm font-semibold text-muted-foreground">{currencySymbol()}</span>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
          inputMode="decimal"
          placeholder="5000"
          aria-label={`Amount for ${cat.name}`}
          className="num h-full min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </label>
      <FilledButton type="submit" className="h-10 px-4" disabled={!(value > 0)}>
        Set {value > 0 ? money(value) : ""}
      </FilledButton>
    </form>
  );
}

/**
 * Dims the screen around the control Penny is talking about, rings it, and
 * gently zooms it. With a gesture, an animated finger shows the swipe.
 * Never blocks taps: everything here ignores the pointer.
 */
function Spotlight({ target, gesture }: { target?: string; gesture?: Gesture }) {
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    let raf = 0;
    let zoomed: Element | null = null;
    const tick = () => {
      const el = target
        ? [...document.querySelectorAll(`[data-tour="${target}"]`)].find((e) => {
            const r = e.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
          })
        : undefined;
      // Step aside while a form or popup is open over the page.
      const covered = !!document.querySelector('[role="dialog"]:not([aria-label="Guided tour"])');
      const r = el && !covered ? el.getBoundingClientRect() : null;
      setRect((prev) => {
        if (!r) return prev ? null : prev;
        const next = { x: r.left, y: r.top, w: r.width, h: r.height };
        return prev &&
          Math.abs(prev.x - next.x) < 0.5 &&
          Math.abs(prev.y - next.y) < 0.5 &&
          Math.abs(prev.w - next.w) < 0.5 &&
          Math.abs(prev.h - next.h) < 0.5
          ? prev
          : next;
      });
      // A big panel (the More sheet) is ringed but not zoomed.
      const zoomable = el && !covered && r && r.height < 160 ? el : null;
      if (zoomable !== zoomed) {
        zoomed?.classList.remove("sb-tour-zoom");
        zoomed = zoomable;
      }
      // React may rewrite the element's classes when it re-renders; keep ours on.
      if (zoomable && !zoomable.classList.contains("sb-tour-zoom")) {
        zoomable.classList.add("sb-tour-zoom");
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      zoomed?.classList.remove("sb-tour-zoom");
    };
  }, [target]);

  const pad = 8;
  const finger = (
    <span className="relative block h-11 w-11 rounded-full border-2 border-white bg-white/35 shadow-[0_0_0_6px_rgba(255,255,255,0.15)] backdrop-blur-[1px]" />
  );

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[55]">
      {rect && (
        <div
          className="absolute rounded-[22px] ring-2 ring-primary transition-all duration-300 ease-out"
          style={{
            left: rect.x - pad,
            top: rect.y - pad,
            width: rect.w + pad * 2,
            height: rect.h + pad * 2,
            boxShadow: "0 0 0 200vmax rgb(0 0 0 / 0.45)",
          }}
        >
          <span className="sb-tour-ring absolute inset-0 rounded-[22px] ring-4 ring-primary/60" />
        </div>
      )}

      {gesture === "swipe-up" && rect && (
        <div
          className="absolute"
          style={{ left: rect.x + rect.w / 2, top: rect.y + rect.h / 2 - 22 }}
        >
          <span
            className="sb-tour-trail absolute bottom-0 left-1/2 block h-[90px] w-3 origin-bottom rounded-full bg-gradient-to-t from-white/60 to-white/0"
            style={{ transform: "translateX(-50%)" }}
          />
          <span className="sb-tour-swipe-up absolute left-1/2 top-0 block">{finger}</span>
        </div>
      )}

      {gesture === "swipe-down" && rect && (
        <div className="absolute" style={{ left: rect.x + rect.w / 2, top: rect.y + 12 }}>
          <span className="sb-tour-swipe-down absolute left-1/2 top-0 block">{finger}</span>
        </div>
      )}

      {gesture === "pull" && (
        <div className="absolute inset-0 bg-black/30">
          <div className="absolute left-1/2 top-[22%]">
            <span className="sb-tour-swipe-down absolute left-1/2 top-0 block">{finger}</span>
          </div>
        </div>
      )}
    </div>
  );
}
