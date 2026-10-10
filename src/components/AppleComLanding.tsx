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

function AppleLink({
  to,
  children,
  className,
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link to={to} preload="intent" className={cn("apple-com-link tap", className)}>
      {children}
      <ChevronRight className="ml-0.5 inline h-3.5 w-3.5 opacity-80" aria-hidden />
    </Link>
  );
}

function Panel({
  id,
  theme,
  eyebrow,
  title,
  subtitle,
  children,
  learnHref,
}: {
  id: string;
  theme: "dark" | "light";
  eyebrow?: string;
  title: ReactNode;
  subtitle: string;
  children: ReactNode;
  learnHref: string;
}) {
  const { ref, visible } = useReveal<HTMLElement>({ threshold: 0.15 });

  return (
    <section
      id={id}
      ref={ref}
      className={cn(
        "apple-com-panel scroll-mt-12",
        theme === "dark" ? "apple-com-panel-dark" : "apple-com-panel-light",
        visible && "apple-com-panel-visible",
      )}
    >
      <div className="apple-com-panel-copy">
        {eyebrow && <p className="apple-com-eyebrow">{eyebrow}</p>}
        <h2 className="apple-com-headline">{title}</h2>
        <p className="apple-com-subhead">{subtitle}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-5 text-[17px]">
          <AppleLink to={learnHref}>Learn more</AppleLink>
          <Link to="/home" preload="intent" className="apple-com-cta tap">
            Get started
          </Link>
        </div>
      </div>
      <div className="apple-com-visual-wrap">{children}</div>
    </section>
  );
}

function BudgetVisual() {
  return (
    <div className="apple-com-device apple-com-glow-teal">
      <div className="apple-com-screen">
        <p className="text-[11px] font-medium text-white/55">Ready to Assign</p>
        <p className="num mt-2 text-4xl font-semibold tracking-tight text-white md:text-5xl">
          ₹24,500
        </p>
        <div className="mt-8 space-y-3">
          {[
            { n: "Groceries", w: "72%" },
            { n: "Rent", w: "100%" },
            { n: "School", w: "45%" },
          ].map((r) => (
            <div key={r.n}>
              <div className="flex justify-between text-xs text-white/70">
                <span>{r.n}</span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-teal-400/90" style={{ width: r.w }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PayVisual() {
  return (
    <div className="apple-com-device apple-com-glow-amber">
      <div className="apple-com-screen text-center">
        <p className="text-sm font-semibold text-white">Dinner split</p>
        <p className="num mt-1 text-3xl font-semibold">₹2,400</p>
        <div className="mx-auto mt-6 max-w-[200px] rounded-2xl bg-white/10 p-4 backdrop-blur-md">
          <p className="text-[11px] uppercase tracking-wider text-white/50">One transfer</p>
          <p className="mt-2 text-sm font-medium">Ajay → You</p>
          <p className="num mt-1 text-xl font-semibold text-amber-300">₹800</p>
        </div>
        <div className="mt-6 inline-flex rounded-full bg-white px-5 py-2 text-sm font-semibold text-black">
          Pay with UPI
        </div>
      </div>
    </div>
  );
}

function ReportsVisual() {
  return (
    <div className="apple-com-device apple-com-glow-blue">
      <div className="apple-com-screen flex flex-col justify-end">
        <div className="flex h-40 items-end justify-center gap-2 px-4">
          {[38, 62, 48, 78, 55, 92].map((h, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full max-w-3 rounded-sm bg-sky-400/90" style={{ height: `${h}%` }} />
              <div
                className="w-full max-w-3 rounded-sm bg-amber-400/80"
                style={{ height: `${Math.max(h - 20, 12)}%` }}
              />
            </div>
          ))}
        </div>
        <p className="pb-2 text-center text-xs text-white/50">Income vs expense</p>
      </div>
    </div>
  );
}

function FamilyVisual() {
  return (
    <div className="apple-com-device apple-com-glow-violet">
      <div className="apple-com-screen">
        <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-lg font-semibold">
            🏠
          </span>
          <div className="text-left">
            <p className="font-semibold">Sharma Family</p>
            <p className="text-sm text-white/55">3 members · encrypted sync</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-center text-[11px] font-medium text-white/70">
          {["App lock", "Avatars", "Backup", "Multi-home"].map((t) => (
            <div key={t} className="rounded-xl bg-white/8 py-3">{t}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AppleComLanding() {
  const [navSolid, setNavSolid] = useState(false);
  const hero = useReveal<HTMLElement>({ threshold: 0.05 });

  useEffect(() => {
    const onScroll = () => setNavSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="apple-com">
      <nav
        className={cn(
          "apple-com-nav fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top)]",
          navSolid && "apple-com-nav-solid",
        )}
        aria-label="Global"
      >
        <div className="mx-auto flex h-11 max-w-[980px] items-center justify-between px-4 md:px-6">
          <Link to="/" className="apple-com-nav-logo tap">
            <span className="sr-only">SmartBudget</span>
            <span aria-hidden className="num text-lg font-semibold">₹</span>
          </Link>
          <ul className="hidden flex-1 items-center justify-center gap-8 md:flex">
            {NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="apple-com-nav-link tap text-[12px]">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-4">
            <Link to="/home" className="apple-com-nav-link tap hidden text-[12px] sm:inline">
              Sign in
            </Link>
            <Link to="/home" preload="intent" className="apple-com-nav-cta tap text-[12px]">
              Open app
            </Link>
          </div>
        </div>
      </nav>

      <header
        ref={hero.ref}
        className={cn("apple-com-hero", hero.visible && "apple-com-hero-visible")}
      >
        <div className="apple-com-hero-bg" aria-hidden />
        <div className="apple-com-hero-inner">
          <p className="apple-com-hero-eyebrow">New</p>
          <h1 className="apple-com-hero-title">
            SmartBudget<span className="apple-com-hero-dot">.</span>
          </h1>
          <p className="apple-com-hero-tagline">Family finance. Zero-based. Built for India.</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-[17px] md:text-[19px]">
            <Link to="/home" preload="intent" className="apple-com-cta tap">
              Get started
            </Link>
            <a href="#budget" className="apple-com-link tap">
              Explore features
              <ChevronRight className="ml-0.5 inline h-4 w-4" aria-hidden />
            </a>
          </div>
        </div>
        <div className="apple-com-hero-product">
          <BudgetVisual />
        </div>
      </header>

      <div className="apple-com-grid">
        <Panel
          id="budget"
          theme="light"
          eyebrow="Zero-based"
          title={
            <>
              Every rupee.
              <br />
              On purpose.
            </>
          }
          subtitle="Assign income before you spend. Ready to Assign keeps the whole household honest — without the spreadsheet dread."
          learnHref="/budget"
        >
          <BudgetVisual />
        </Panel>

        <Panel
          id="smartpay"
          theme="dark"
          eyebrow="SmartPay"
          title={
            <>
              Split the bill.
              <br />
              Not the friendship.
            </>
          }
          subtitle="UPI splits, minimal settlements, and shareable summaries — so hisab kitab takes seconds, not a group chat war."
          learnHref="/pay"
        >
          <PayVisual />
        </Panel>

        <Panel
          id="reports"
          theme="light"
          eyebrow="Insights"
          title={
            <>
              Clarity,
              <br />
              not clutter.
            </>
          }
          subtitle="Income, expenses, categories, and net worth — presented calmly, like a keynote slide, not a tax audit."
          learnHref="/reports"
        >
          <ReportsVisual />
        </Panel>

        <Panel
          id="family"
          theme="dark"
          eyebrow="Together"
          title={
            <>
              One home.
              <br />
              Many hands.
            </>
          }
          subtitle="Shared homes, encrypted data, profiles with avatars, and an app lock — family finance that stays yours."
          learnHref="/settings"
        >
          <FamilyVisual />
        </Panel>
      </div>

      <section className="apple-com-closer">
        <h2 className="apple-com-closer-title">Your money. Your server.</h2>
        <p className="apple-com-closer-sub">
          Self-hosted SmartBudget — syncs with Lovable, runs in Docker, feels like a flagship.
        </p>
        <Link to="/home" preload="intent" className="apple-com-cta-lg tap">
          Open SmartBudget
        </Link>
      </section>

      <footer className="apple-com-footer">
        <div className="mx-auto max-w-[980px] px-4 py-8 md:px-6">
          <p className="text-[12px] leading-relaxed text-[var(--apple-com-muted)]">
            Copyright © {new Date().getFullYear()} SmartBudget. Zero-based budgeting for Indian families.
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-[12px]">
            <Link to="/home" className="apple-com-footer-link">App</Link>
            <a href="#budget" className="apple-com-footer-link">Features</a>
            <Link to="/settings" className="apple-com-footer-link">Settings</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
