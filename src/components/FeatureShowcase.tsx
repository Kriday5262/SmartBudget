import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Brain,
  Home,
  PiggyBank,
  Shield,
  Sparkles,
  Split,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    id: "budget",
    eyebrow: "Zero-based",
    title: "Every rupee has a job.",
    body:
      "Assign income to categories before you spend. See Ready to Assign at a glance and keep the whole family aligned on what money is for.",
    href: "/budget",
    cta: "Open Budget",
    gradient: "from-primary/25 via-primary/5 to-transparent",
    visual: "budget" as const,
  },
  {
    id: "pay",
    eyebrow: "SmartPay",
    title: "Split bills. Settle in one tap.",
    body:
      "Split UPI expenses with household members, compute minimal settlements, and share WhatsApp-friendly summaries with payment links.",
    href: "/pay",
    cta: "Try SmartPay",
    gradient: "from-accent/30 via-accent/5 to-transparent",
    visual: "pay" as const,
  },
  {
    id: "reports",
    eyebrow: "Insights",
    title: "See the story behind spending.",
    body:
      "Income vs expense trends, category breakdowns, and net worth — designed to feel calm, not like a spreadsheet avalanche.",
    href: "/reports",
    cta: "View Reports",
    gradient: "from-chart-3/25 via-transparent to-transparent",
    visual: "reports" as const,
  },
  {
    id: "family",
    eyebrow: "Together",
    title: "One home. Many hands.",
    body:
      "Shared SQLite homes, per-user avatars, encrypted storage, and an app lock — family finance that respects privacy.",
    href: "/settings",
    cta: "Home & Security",
    gradient: "from-primary/20 via-secondary to-transparent",
    visual: "family" as const,
  },
] as const;

const BENTO = [
  {
    icon: Brain,
    title: "AI assistant",
    copy: "Ask questions about your data with a self-hosted AI helper.",
  },
  {
    icon: Zap,
    title: "Keyboard mode",
    copy: "Spreadsheet-speed entry with shortcuts — built for power users.",
  },
  {
    icon: Shield,
    title: "Encrypted",
    copy: "Sensitive fields protected; you hold the keys on your server.",
  },
  {
    icon: Users,
    title: "Multi-user",
    copy: "Switch profiles without mixing households or histories.",
  },
] as const;

function Reveal({
  children,
  className,
  delayMs = 0,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn("apple-reveal", visible && "apple-reveal-visible", className)}
      style={{ "--apple-reveal-delay": `${delayMs}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

function BudgetMock() {
  return (
    <div className="apple-device-inner space-y-3 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Ready to assign
        </span>
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
          Healthy
        </span>
      </div>
      <p className="num text-3xl font-bold tracking-tight">
        <span className="text-primary">₹</span> 24,500.00
      </p>
      <div className="space-y-2 pt-1">
        {[
          { name: "Groceries", pct: 72, amt: "₹8,200" },
          { name: "Rent", pct: 100, amt: "₹18,000" },
          { name: "Kids school", pct: 45, amt: "₹4,500" },
        ].map((row) => (
          <div key={row.name} className="rounded-2xl border border-border/60 bg-card/80 p-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>{row.name}</span>
              <span className="num text-muted-foreground">{row.amt}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full gradient-primary transition-all duration-700"
                style={{ width: `${row.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PayMock() {
  return (
    <div className="apple-device-inner space-y-3 p-4">
      <p className="text-sm font-bold">Dinner · ₹2,400</p>
      <div className="flex -space-x-2">
        {["K", "A", "M"].map((l, i) => (
          <span
            key={l}
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-primary/90 text-xs font-bold text-primary-foreground"
            style={{ zIndex: 3 - i }}
          >
            {l}
          </span>
        ))}
      </div>
      <div className="rounded-2xl border border-border/60 bg-card/80 p-3 text-xs">
        <p className="font-bold text-muted-foreground">Minimal settlement</p>
        <p className="mt-2 font-semibold">Ajay → Kriday</p>
        <p className="num mt-0.5 text-lg font-bold text-primary">₹800</p>
        <button
          type="button"
          className="mt-3 w-full rounded-xl gradient-primary py-2 text-[11px] font-bold text-primary-foreground"
        >
          Pay with UPI
        </button>
      </div>
    </div>
  );
}

function ReportsMock() {
  return (
    <div className="apple-device-inner flex h-full flex-col justify-end p-4">
      <div className="flex h-28 items-end justify-between gap-2 px-1">
        {[40, 65, 52, 78, 58, 88].map((h, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full max-w-[14px] rounded-t-md bg-[var(--chart-1)] opacity-90"
              style={{ height: `${h}%` }}
            />
            <div
              className="w-full max-w-[14px] rounded-t-md bg-[var(--chart-2)] opacity-80"
              style={{ height: `${Math.max(h - 18, 12)}%` }}
            />
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Income vs expense
      </p>
    </div>
  );
}

function FamilyMock() {
  return (
    <div className="apple-device-inner space-y-3 p-4">
      <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/80 p-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary text-sm font-bold text-primary-foreground">
          <Home className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-bold">Sharma Family</p>
          <p className="text-[11px] text-muted-foreground">3 members · synced</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {["Encrypted DB", "App lock", "Avatars", "Backup"].map((label) => (
          <div
            key={label}
            className="rounded-xl border border-border/50 bg-muted/50 px-2 py-2 text-center text-[10px] font-bold text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureVisual({ type }: { type: (typeof FEATURES)[number]["visual"] }) {
  const mock =
    type === "budget" ? (
      <BudgetMock />
    ) : type === "pay" ? (
      <PayMock />
    ) : type === "reports" ? (
      <ReportsMock />
    ) : (
      <FamilyMock />
    );

  return (
    <div className="apple-device-frame apple-float-slow">
      <div className="apple-device-notch" />
      {mock}
    </div>
  );
}

function FeatureBlock({
  feature,
  index,
}: {
  feature: (typeof FEATURES)[number];
  index: number;
}) {
  const flip = index % 2 === 1;
  const { ref, visible } = useReveal<HTMLElement>({ threshold: 0.12 });

  return (
    <section
      ref={ref}
      className={cn(
        "apple-feature-section relative scroll-mt-8 py-10 md:py-16",
        visible && "apple-feature-section-visible",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 -z-10 rounded-[2rem] bg-gradient-to-b opacity-80",
          feature.gradient,
        )}
      />
      <div
        className={cn(
          "grid items-center gap-10 md:grid-cols-2 md:gap-14",
          flip && "md:[&>*:first-child]:order-2",
        )}
      >
        <div className="space-y-4 px-1">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{feature.eyebrow}</p>
          <h2 className="font-display text-[clamp(1.75rem,5vw,2.75rem)] font-bold leading-[1.08] tracking-tight">
            {feature.title}
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
            {feature.body}
          </p>
          <Link
            to={feature.href}
            preload="intent"
            className="tap group inline-flex items-center gap-2 text-sm font-bold text-primary"
          >
            {feature.cta}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <FeatureVisual type={feature.visual} />
      </div>
    </section>
  );
}

export function FeatureShowcase({ bleed = true }: { bleed?: boolean }) {
  const hero = useReveal<HTMLElement>({ threshold: 0.05 });

  return (
    <div className={cn("apple-features", bleed && "-mx-4 md:-mx-8")}>
      {/* Hero */}
      <header
        ref={hero.ref}
        className={cn(
          "relative overflow-hidden px-4 pb-16 pt-6 text-center md:px-8 md:pb-24 md:pt-10",
          hero.visible && "apple-hero-visible",
        )}
      >
        <div className="apple-hero-glow pointer-events-none absolute inset-0 -z-10" aria-hidden />
        <div className="apple-orb apple-orb-a" aria-hidden />
        <div className="apple-orb apple-orb-b" aria-hidden />

        <div className="apple-hero-badge mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/70 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-primary shadow-sm backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5" />
          SmartBudget · Family finance
        </div>

        <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Introducing</p>
        <h1 className="font-display mt-3 text-[clamp(2.5rem,10vw,4.25rem)] font-bold leading-[1.02] tracking-tight">
          Budgeting,
          <br />
          <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
            beautifully simple.
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-muted-foreground md:text-base">
          Zero-based envelopes, UPI bill splitting, and calm insights — crafted with the polish you expect
          from a flagship app, self-hosted on your terms.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/home"
            preload="intent"
            className="tap inline-flex items-center gap-2 rounded-full gradient-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-[var(--shadow-3d)]"
          >
            <Wallet className="h-4 w-4" />
            Open app
          </Link>
          <Link
            to="/home"
            preload="intent"
            className="tap inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-6 py-3 text-sm font-bold backdrop-blur-sm"
          >
            <PiggyBank className="h-4 w-4 text-primary" />
            Start budgeting
          </Link>
        </div>

        <div className="mx-auto mt-14 max-w-3xl">
          <div className="apple-device-frame apple-hero-device mx-auto max-w-[280px]">
            <div className="apple-device-notch" />
            <BudgetMock />
          </div>
        </div>
      </header>

      {/* Marquee stats */}
      <div className="border-y border-border/60 bg-card/40 px-4 py-6 backdrop-blur-sm md:px-8">
        <ul className="mx-auto grid max-w-4xl grid-cols-2 gap-6 md:grid-cols-4">
          {[
            { label: "Currency", value: "₹ INR" },
            { label: "Method", value: "Zero-based" },
            { label: "Payments", value: "UPI SmartPay" },
            { label: "Hosting", value: "Yours" },
          ].map((stat, i) => (
            <Reveal key={stat.label} delayMs={i * 80}>
              <li className="text-center">
                <p className="num text-lg font-bold md:text-xl">{stat.value}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {stat.label}
                </p>
              </li>
            </Reveal>
          ))}
        </ul>
      </div>

      {/* Feature scroll sections */}
      <div className="px-4 md:px-8">
        {FEATURES.map((f, i) => (
          <FeatureBlock key={f.id} feature={f} index={i} />
        ))}
      </div>

      {/* Bento grid */}
      <section className="px-4 py-12 md:px-8 md:py-16">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">And more</p>
          <h2 className="font-display mt-2 text-2xl font-bold tracking-tight md:text-3xl">
            Power without the noise.
          </h2>
        </Reveal>
        <div className="mx-auto mt-8 grid max-w-4xl gap-3 sm:grid-cols-2">
          {BENTO.map((item, i) => (
            <Reveal key={item.title} delayMs={i * 60}>
              <div className="apple-bento-card lift h-full p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl gradient-primary text-primary-foreground shadow-sm">
                  <item.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-bold">{item.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{item.copy}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="px-4 pb-20 md:px-8 md:pb-28">
        <Reveal>
          <div className="relative mx-auto max-w-3xl overflow-hidden rounded-[2rem] border border-border/60 bg-card p-8 text-center shadow-[var(--shadow-lift)] md:p-12">
            <div
              className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl"
              aria-hidden
            />
            <BarChart3 className="mx-auto h-8 w-8 text-primary" />
            <h2 className="font-display mt-4 text-2xl font-bold tracking-tight md:text-3xl">
              Your money. Your server. Your rules.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              SmartBudget syncs with Lovable, runs in Docker, and keeps the whole household on the same
              page — with animations that make the daily check-in feel good.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/pay"
                preload="intent"
                className="tap inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-bold"
              >
                <Split className="h-4 w-4 text-primary" />
                Explore SmartPay
              </Link>
              <Link
                to="/home"
                preload="intent"
                className="tap inline-flex items-center gap-2 rounded-full gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
              >
                Open app
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
