import { useEffect, useId, useState } from "react";
import type { ComponentType, CSSProperties, InputHTMLAttributes, ReactNode } from "react";
import {
  AlertCircle,
  ArrowRight,
  AtSign,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  PieChart,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { unlock, changePassword, registerUser } from "@/lib/lock";
import { LogoMark, TAGLINE } from "@/components/Logo";

type AuthMode = "login" | "register" | "reset";

const HEADINGS: Record<AuthMode, { title: string; subtitle: string }> = {
  login: {
    title: "Welcome back",
    subtitle: "Sign in to pick up where your household left off.",
  },
  register: {
    title: "Create your account",
    subtitle: "Set up a profile to start budgeting with your household.",
  },
  reset: {
    title: "Set a new password",
    subtitle: "One quick step before you continue.",
  },
};

const HIGHLIGHTS = [
  { icon: Users, text: "Shared household budgets" },
  { icon: PieChart, text: "Reports that show where money goes" },
  { icon: ShieldCheck, text: "Self-hosted, private by default" },
];

export function LockScreen() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetUser, setResetUser] = useState<{ username: string; current: string } | null>(null);

  const [remember, setRemember] = useState(true);

  async function completeUnlock(
    user: { username: string; current: string },
    rememberMe: boolean,
    newPassword?: string,
  ) {
    if (newPassword) {
      const changed = await changePassword(user.current, newPassword);
      if (!changed) {
        setError("Could not update the password. Try again.");
        setBusy(false);
        return;
      }
    }
    const res = await unlock(newPassword ?? user.current, user.username, rememberMe);
    if (!res.ok) {
      setError("Could not complete sign-in. Try again.");
      setBusy(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return setError("Please enter your username");
    setBusy(true);
    const res = await unlock(password, username.trim(), remember);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Incorrect username or password");
      setPassword("");
      return;
    }
    if (res.needsReset) {
      setResetUser({ username: username.trim(), current: password });
      setPassword("");
      setConfirm("");
      setMode("reset");
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Please enter your name");
    if (!username.trim()) return setError("Please enter a username");
    if (password.length < 8) return setError("Password must be at least 8 characters");
    if (password !== confirm) return setError("Passwords do not match");
    setBusy(true);
    const res = await registerUser(name.trim(), username.trim(), password, remember);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Registration failed");
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!resetUser) return;
    if (password.length < 8) return setError("Password must be at least 8 characters");
    if (password !== confirm) return setError("Passwords do not match");
    setBusy(true);
    await completeUnlock(resetUser, remember, password);
    setBusy(false);
  }

  function switchMode(next: AuthMode) {
    setMode(next);
    setError("");
    setPassword("");
    setConfirm("");
  }

  const heading = HEADINGS[mode];

  return (
    <main className="flex min-h-screen w-full bg-background">
      {/* Brand panel — desktop only */}
      <aside className="relative hidden w-[44%] max-w-xl flex-col justify-between overflow-hidden bg-brand bg-linear-150 from-brand-light via-brand to-brand-deep p-10 text-white lg:flex xl:p-14">
        <div
          aria-hidden
          className="sb-drift pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="sb-drift-slow pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-brand-deep/70 blur-3xl"
        />

        <div className="sb-rise relative flex items-center gap-3">
          <LogoMark className="h-10 w-10 text-white" />
          <span className="font-display text-lg font-bold tracking-tight">SmartBudget</span>
        </div>

        <div className="relative space-y-8">
          <h2
            className="sb-rise font-display text-4xl font-bold leading-[1.15] tracking-tight xl:text-[2.75rem]"
            style={{ "--d": "120ms" } as CSSProperties}
          >
            Give every penny
            <br />a purpose.
          </h2>

          {/* Decorative budget preview */}
          <div className="sb-rise" style={{ "--d": "260ms" } as CSSProperties}>
            <BudgetPreview />
          </div>

          <ul className="space-y-3 text-sm">
            {HIGHLIGHTS.map(({ icon: Icon, text }, i) => (
              <li
                key={text}
                className="sb-rise flex items-center gap-3"
                style={{ "--d": `${420 + i * 90}ms` } as CSSProperties}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-white/95">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/80">Self-hosted family budgeting</p>
      </aside>

      {/* Form panel */}
      <section className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          {/* Compact brand header — mobile/tablet */}
          <div className="sb-rise mb-8 flex items-center gap-3 lg:hidden">
            <LogoMark className="h-11 w-11 text-logo" />
            <span className="leading-tight">
              <span className="block font-display text-lg font-bold tracking-tight">
                SmartBudget
              </span>
              <span className="block text-xs font-medium text-primary">{TAGLINE}</span>
            </span>
          </div>

          <header key={`heading-${mode}`} className="sb-rise mb-6 space-y-1.5">
            <h1 className="font-display text-2xl font-bold tracking-tight">{heading.title}</h1>
            <p className="text-sm text-muted-foreground">{heading.subtitle}</p>
          </header>

          {mode !== "reset" && (
            <div
              role="tablist"
              aria-label="Sign in or create an account"
              className="sb-rise relative mb-6 grid grid-cols-2 rounded-2xl bg-muted p-1 text-sm font-semibold"
            >
              <span
                aria-hidden
                className={cn(
                  "absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-xl bg-card shadow-sm ring-1 ring-border transition-transform duration-300 ease-out dark:bg-white/12",
                  mode === "register" && "translate-x-full",
                )}
              />
              {(
                [
                  ["login", "Sign in"],
                  ["register", "Create account"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={mode === value}
                  onClick={() => switchMode(value)}
                  className={cn(
                    "tap relative z-10 min-h-[40px] rounded-xl transition-colors",
                    mode === value
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {mode === "login" && (
            <form
              key={`form-${mode}`}
              onSubmit={handleLogin}
              className="sb-stagger space-y-4"
              noValidate
            >
              <Field
                label="Username"
                icon={AtSign}
                autoFocus
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="e.g. admin"
                value={username}
                onChange={(v) => {
                  setUsername(v);
                  setError("");
                }}
              />
              <PasswordField
                label="Password"
                autoComplete="current-password"
                value={password}
                onChange={(v) => {
                  setPassword(v);
                  setError("");
                }}
              />
              <RememberMe checked={remember} onChange={setRemember} />
              <ErrorMessage message={error} />
              <SubmitButton busy={busy} busyLabel="Signing in…">
                Sign in
              </SubmitButton>
            </form>
          )}

          {mode === "register" && (
            <form
              key={`form-${mode}`}
              onSubmit={handleRegister}
              className="sb-stagger space-y-4"
              noValidate
            >
              <Field
                label="Full name"
                icon={User}
                autoFocus
                autoComplete="name"
                placeholder="Your name"
                value={name}
                onChange={(v) => {
                  setName(v);
                  setError("");
                }}
              />
              <Field
                label="Username"
                icon={AtSign}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="Choose a username"
                value={username}
                onChange={(v) => {
                  setUsername(v);
                  setError("");
                }}
              />
              <PasswordField
                label="Password"
                autoComplete="new-password"
                hint="At least 8 characters"
                value={password}
                onChange={(v) => {
                  setPassword(v);
                  setError("");
                }}
              />
              <PasswordField
                label="Confirm password"
                autoComplete="new-password"
                value={confirm}
                onChange={(v) => {
                  setConfirm(v);
                  setError("");
                }}
              />
              <RememberMe checked={remember} onChange={setRemember} />
              <ErrorMessage message={error} />
              <SubmitButton busy={busy} busyLabel="Creating account…">
                Create account
              </SubmitButton>
            </form>
          )}

          {mode === "reset" && (
            <form
              key={`form-${mode}`}
              onSubmit={handleReset}
              className="sb-stagger space-y-4"
              noValidate
            >
              <div className="flex gap-3 rounded-2xl border border-border bg-muted/60 p-4 text-sm">
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-muted-foreground">
                  <strong className="text-foreground">{resetUser?.username}</strong> still uses the
                  old shared password. Set a new personal password to continue.
                </p>
              </div>
              <PasswordField
                label="New password"
                autoFocus
                autoComplete="new-password"
                hint="At least 8 characters"
                value={password}
                onChange={(v) => {
                  setPassword(v);
                  setError("");
                }}
              />
              <PasswordField
                label="Confirm new password"
                autoComplete="new-password"
                value={confirm}
                onChange={(v) => {
                  setConfirm(v);
                  setError("");
                }}
              />
              <ErrorMessage message={error} />
              <SubmitButton busy={busy} busyLabel="Updating password…">
                Save and continue
              </SubmitButton>
              <button
                type="button"
                onClick={() => {
                  setResetUser(null);
                  switchMode("login");
                }}
                className="tap w-full rounded-xl py-2 text-center text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Back to sign in
              </button>
            </form>
          )}

          <p className="sb-rise mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            Your budget data stays on your own server
          </p>
        </div>
      </section>
    </main>
  );
}

function useCountUp(target: number, duration = 1400, delay = 500) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now() + delay;
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start) / duration));
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, delay]);
  return value;
}

// Illustrative numbers only. No currency symbol, and digit grouping follows the
// viewer's locale (42,500 / 42.500 / 42 500), so the card reads naturally anywhere.
const SAMPLE_BUDGET = 4800;
const SAMPLE_SPENT = 3240;
const SAMPLE_CATEGORIES = [
  ["Groceries", 920],
  ["Housing", 1800],
  ["Fun", 215],
] as const;

function BudgetPreview() {
  const spent = useCountUp(SAMPLE_SPENT);
  const pct = useCountUp(Math.round((SAMPLE_SPENT / SAMPLE_BUDGET) * 100));
  const fmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
  return (
    <div aria-hidden className="sb-float">
      <div className="max-w-sm rounded-3xl bg-white/10 p-5 shadow-2xl shadow-black/20 ring-1 ring-white/20 backdrop-blur-md">
        <div className="flex items-baseline justify-between text-white/85">
          <span className="text-xs font-semibold uppercase tracking-wider">Spent this month</span>
          <span className="num text-xs">{pct}%</span>
        </div>
        <p className="mt-1 flex items-baseline gap-2">
          <span className="num text-3xl font-bold">{fmt.format(spent)}</span>
          <span className="num text-sm text-white/80">/ {fmt.format(SAMPLE_BUDGET)}</span>
        </p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
          <div
            className="sb-grow h-full rounded-full bg-white"
            style={{ width: `${Math.round((SAMPLE_SPENT / SAMPLE_BUDGET) * 100)}%` }}
          />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
          {SAMPLE_CATEGORIES.map(([label, value], i) => (
            <div
              key={label}
              className="sb-rise rounded-xl bg-white/10 px-2.5 py-2"
              style={{ "--d": `${700 + i * 110}ms` } as CSSProperties}
            >
              <p className="text-white/85">{label}</p>
              <p className="num mt-0.5 font-semibold">{fmt.format(value)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  label: string;
  icon: ComponentType<{ className?: string }>;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  trailing?: ReactNode;
};

function Field({
  label,
  icon: Icon,
  value,
  onChange,
  hint,
  trailing,
  className,
  ...rest
}: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-foreground">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={hintId}
          className={cn(
            "h-12 w-full rounded-2xl border border-input bg-card pl-10 dark:border-white/15 dark:bg-white/[0.04] pr-3 text-base shadow-sm transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 md:text-sm",
            trailing ? "pr-12" : undefined,
            className,
          )}
          {...rest}
        />
        {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
      </div>
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

function PasswordField(props: Omit<FieldProps, "icon" | "type" | "trailing">) {
  const [visible, setVisible] = useState(false);
  return (
    <Field
      {...props}
      icon={Lock}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="tap flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      }
    />
  );
}

function RememberMe({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-[44px] cursor-pointer select-none items-center gap-3 text-sm text-muted-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-border accent-[var(--primary)]"
      />
      <span>Keep me signed in on this device</span>
    </label>
  );
}

function ErrorMessage({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="sb-shake flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2.5 text-sm font-medium text-destructive"
    >
      <AlertCircle className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

function SubmitButton({
  busy,
  busyLabel,
  children,
}: {
  busy: boolean;
  busyLabel: string;
  children: ReactNode;
}) {
  return (
    <Button
      type="submit"
      disabled={busy}
      className="sb-shine group h-12 w-full rounded-2xl gradient-primary text-base font-bold text-white shadow-md transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
    >
      {busy ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {busyLabel}
        </>
      ) : (
        <>
          {children}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </>
      )}
    </Button>
  );
}
