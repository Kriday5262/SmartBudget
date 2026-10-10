import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Budget", href: "#budget" },
  { label: "SmartPay", href: "#smartpay" },
  { label: "Reports", href: "#reports" },
  { label: "Family", href: "#family" },
] as const;

const FEATURES = [
  {
    id: "budget",
    eyebrow: "Budget",
    title: "Every rupee has a job",
    subtitle:
      "Ready to Assign at the center — assign income to categories before you spend, just like in the app.",
    learnHref: "/budget",
    shot: {
      src: "/landing/budget.png",
      alt: "SmartBudget zero-based budget view",
    },
  },
  {
    id: "smartpay",
    eyebrow: "SmartPay",
    title: "Split UPI bills. Settle fast.",
    subtitle:
      "Minimal settlements, pay links, and WhatsApp summaries — the same SmartPay screen you use after dinner.",
    learnHref: "/pay",
    shot: {
      src: "/landing/pay.png",
      alt: "SmartPay UPI bill splitting",
    },
  },
  {
    id: "reports",
    eyebrow: "Reports",
    title: "Income vs expense, at a glance",
    subtitle:
      "Net worth, spending by category, and six-month trends — identical to the Reports tab in the app.",
    learnHref: "/reports",
    shot: {
      src: "/landing/reports.png",
      alt: "SmartBudget spending reports and charts",
    },
  },
  {
    id: "family",
    eyebrow: "Settings",
    title: "Family profile & shared homes",
    subtitle:
      "Avatars, households, themes, and security — the iOS-style settings groups you already use in-app.",
    learnHref: "/settings",
    shot: {
      src: "/landing/settings.png",
      alt: "SmartBudget settings and family profile",
    },
  },
] as const;

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </p>
  );
}

function HealthyPill({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      preload="intent"
      className={cn(
        "tap inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-semibold",
        "border-primary/15 bg-primary/8 text-primary hover:bg-primary/12",
      )}
    >
      <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
      {children}
      <ChevronRight className="h-3.5 w-3.5" />
    </Link>
  );
}

/** White app card + full-bleed screenshot (matches in-app surfaces). */
function FeatureScreenCard({
  id,
  eyebrow,
  title,
  subtitle,
  learnHref,
  shot,
  flip,
}: {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  learnHref: string;
  shot: { src: string; alt: string };
  flip?: boolean;
}) {
  const { ref, visible } = useReveal<HTMLElement>({ threshold: 0.12 });

  return (
    <section id={id} ref={ref} className="scroll-mt-16 px-4 md:px-8">
      <div
        className={cn(
          "mx-auto grid max-w-5xl items-stretch gap-4 md:gap-6",
          flip ? "md:grid-cols-[minmax(0,340px)_1fr]" : "md:grid-cols-[1fr_minmax(0,340px)]",
          visible ? "animate-fade-up" : "opacity-0",
        )}
      >
        <div
          className={cn(
            "surface flex flex-col justify-center rounded-3xl p-5 md:p-6",
            flip ? "md:order-2" : "md:order-1",
          )}
        >
          <SectionLabel>{eyebrow}</SectionLabel>
          <h2 className="mt-2 text-xl font-semibold tracking-tight md:text-2xl">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <HealthyPill to={learnHref}>Open in app</HealthyPill>
            <Link to={learnHref} preload="intent" className="text-xs font-bold text-primary">
              Learn more
            </Link>
          </div>
        </div>

        <div
          className={cn(
            "surface overflow-hidden rounded-3xl p-0 shadow-[var(--shadow-lift)]",
            flip ? "md:order-1" : "md:order-2",
          )}
        >
          <img
            src={shot.src}
            alt={shot.alt}
            width={390}
            height={844}
            className="block w-full max-w-[390px] mx-auto"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
    </section>
  );
}

export function SmartBudgetLanding() {
  const [navSolid, setNavSolid] = useState(false);
  const hero = useReveal<HTMLElement>({ threshold: 0.05 });

  useEffect(() => {
    const onScroll = () => setNavSolid(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="sb-landing min-h-screen bg-background pb-12">
      <header
        className={cn(
          "sticky top-0 z-50 border-b border-transparent pt-[env(safe-area-inset-top)] transition-colors",
          navSolid && "border-border bg-background/90 backdrop-blur-xl shadow-[var(--shadow-card)]",
        )}
      >
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 md:px-8">
          <Link to="/" className="tap flex items-center gap-2.5">
            <span className="num flex h-9 w-9 items-center justify-center rounded-2xl gradient-primary text-sm font-bold text-primary-foreground shadow-md">
              ₹
            </span>
            <span className="leading-tight">
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                SmartBudget
              </span>
              <span className="block text-[15px] font-bold tracking-tight">Family</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-5 md:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground hover:text-primary"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <Link
            to="/home"
            preload="intent"
            className="tap rounded-2xl gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground"
          >
            Open app
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-9 px-4 py-8 md:px-8 md:py-10">
        {/* Hero — mirrors home dashboard header + hero card */}
        <header
          ref={hero.ref}
          className={cn("space-y-6", hero.visible && "animate-bounce-in")}
        >
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
            <div className="min-w-0">
              <SectionLabel>SmartBudget</SectionLabel>
              <h1 className="mt-1 truncate text-lg font-semibold md:text-xl">
                Family budgeting, zero-based
              </h1>
            </div>
            <span className="num flex h-10 w-10 shrink-0 items-center justify-center rounded-full gradient-primary text-base font-bold text-primary-foreground shadow-md">
              ₹
            </span>
          </div>

          <section className="animate-bounce-in flex flex-col items-center py-2 text-center">
            <p className="text-sm text-muted-foreground">Ready to get started?</p>
            <p className="font-display num mt-1 text-[clamp(2rem,10vw,3rem)] font-bold leading-none">
              <span className="text-primary">Assign</span> every rupee
            </p>
            <HealthyPill to="/home">Open your budget</HealthyPill>
          </section>

          <dl className="grid grid-cols-2 gap-3">
            <div className="surface px-4 py-3 text-left">
              <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                SmartPay
              </dt>
              <dd className="num mt-0.5 text-base font-bold">UPI splits</dd>
            </div>
            <div className="surface px-4 py-3 text-left">
              <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Hosting
              </dt>
              <dd className="num mt-0.5 text-base font-bold text-primary">Yours</dd>
            </div>
          </dl>

          <div className="surface overflow-hidden rounded-3xl p-0">
            <img
              src="/landing/home.png"
              alt="SmartBudget home dashboard with Ready to Assign"
              width={390}
              height={844}
              className="mx-auto block w-full max-w-[390px]"
              fetchPriority="high"
            />
          </div>
        </header>

        {/* Feature rows — app-style cards + screenshots */}
        <div className="space-y-10 md:space-y-14">
          <div className="flex items-center justify-between">
            <SectionLabel>Features</SectionLabel>
            <Link to="/home" className="text-xs font-bold text-primary">View app</Link>
          </div>

          {FEATURES.map((f, i) => (
            <FeatureScreenCard key={f.id} {...f} flip={i % 2 === 1} />
          ))}
        </div>

        {/* Closer — same surface card language */}
        <section className="surface rounded-3xl p-6 text-center md:p-8">
          <SectionLabel>Get started</SectionLabel>
          <h2 className="mt-2 font-display text-xl font-bold tracking-tight md:text-2xl">
            Your money. Your server.
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Self-hosted SmartBudget with the same sand-and-teal UI you see in these screens.
          </p>
          <Link
            to="/home"
            preload="intent"
            className="tap mt-5 inline-flex rounded-2xl gradient-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-[var(--shadow-3d)]"
          >
            Open SmartBudget
          </Link>
        </section>

        <footer className="px-2 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} SmartBudget · Zero-based budgeting for Indian families
          </p>
        </footer>
      </div>
    </div>
  );
}
