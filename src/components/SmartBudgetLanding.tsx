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

const SCREENSHOTS = {
  home: { src: "/landing/home.png", alt: "SmartBudget home dashboard with Ready to Assign" },
  budget: { src: "/landing/budget.png", alt: "SmartBudget zero-based budget view" },
  pay: { src: "/landing/pay.png", alt: "SmartPay UPI bill splitting" },
  reports: { src: "/landing/reports.png", alt: "SmartBudget spending reports and charts" },
  settings: { src: "/landing/settings.png", alt: "SmartBudget settings and family profile" },
} as const;

function AppScreenshot({
  shot,
  priority = false,
  size = "panel",
}: {
  shot: (typeof SCREENSHOTS)[keyof typeof SCREENSHOTS];
  priority?: boolean;
  size?: "hero" | "panel";
}) {
  return (
    <figure className={cn("sb-landing-shot", size === "hero" && "sb-landing-shot-hero")}>
      <img
        src={shot.src}
        alt={shot.alt}
        width={390}
        height={844}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
      />
    </figure>
  );
}

function TextLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      preload="intent"
      className="tap inline-flex items-center text-sm font-bold text-primary"
    >
      {children}
      <ChevronRight className="ml-0.5 h-4 w-4" aria-hidden />
    </Link>
  );
}

function Panel({
  id,
  variant,
  eyebrow,
  title,
  subtitle,
  children,
  learnHref,
}: {
  id: string;
  variant: "sand" | "card";
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
        "sb-landing-panel scroll-mt-14",
        variant === "card" && "sb-landing-panel-card",
        visible && "sb-landing-panel-visible",
      )}
    >
      <div className="sb-landing-panel-copy">
        {eyebrow && <p className="sb-landing-eyebrow">{eyebrow}</p>}
        <h2 className="sb-landing-headline font-display">{title}</h2>
        <p className="sb-landing-subhead">{subtitle}</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <TextLink to={learnHref}>Learn more</TextLink>
          <Link
            to="/home"
            preload="intent"
            className="tap inline-flex items-center rounded-full gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-3d)]"
          >
            Open in app
          </Link>
        </div>
      </div>
      <div className="sb-landing-visual-wrap">{children}</div>
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
    <div className="sb-landing">
      <nav
        className={cn(
          "sb-landing-nav fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top)]",
          navSolid && "sb-landing-nav-solid",
        )}
        aria-label="SmartBudget"
      >
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 md:px-8">
          <Link to="/" className="tap flex items-center gap-2.5">
            <span className="num flex h-9 w-9 items-center justify-center rounded-2xl gradient-primary text-sm font-bold text-primary-foreground shadow-sm">
              ₹
            </span>
            <span className="font-display text-[15px] font-bold tracking-tight text-foreground">
              SmartBudget
            </span>
          </Link>
          <ul className="hidden flex-1 items-center justify-center gap-6 md:flex">
            {NAV.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="tap text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground hover:text-primary"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <Link
              to="/home"
              className="tap hidden rounded-full px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              to="/home"
              preload="intent"
              className="tap inline-flex rounded-full gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm"
            >
              Open app
            </Link>
          </div>
        </div>
      </nav>

      <header
        ref={hero.ref}
        className={cn("sb-landing-hero", hero.visible && "sb-landing-hero-visible")}
      >
        <div className="sb-landing-hero-bg" aria-hidden />
        <div className="sb-landing-hero-inner">
          <p className="sb-landing-hero-kicker">Soft sand & teal · Zero-based</p>
          <h1 className="sb-landing-hero-title font-display">
            Assign every{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              rupee
            </span>
            .
          </h1>
          <p className="sb-landing-hero-tagline">
            Family budgeting in INR — accounts, envelopes, UPI SmartPay, and calm reports on your
            own server.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/home"
              preload="intent"
              className="tap inline-flex items-center rounded-full gradient-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-[var(--shadow-3d)]"
            >
              Get started
            </Link>
            <a
              href="#budget"
              className="tap inline-flex items-center rounded-full border border-primary/20 bg-card/80 px-6 py-3 text-sm font-bold text-primary backdrop-blur-sm"
            >
              See features
              <ChevronRight className="ml-1 h-4 w-4" />
            </a>
          </div>
        </div>
        <div className="sb-landing-hero-product">
          <AppScreenshot shot={SCREENSHOTS.home} priority size="hero" />
        </div>
      </header>

      <div className="sb-landing-sections">
        <Panel
          id="budget"
          variant="sand"
          eyebrow="Zero-based"
          title={
            <>
              Every rupee
              <br />
              has a job.
            </>
          }
          subtitle="Ready to Assign at the center — the same flow you use daily in the app, built for Indian households."
          learnHref="/budget"
        >
          <AppScreenshot shot={SCREENSHOTS.budget} />
        </Panel>

        <Panel
          id="smartpay"
          variant="card"
          eyebrow="SmartPay"
          title={
            <>
              Split UPI bills.
              <br />
              Settle fast.
            </>
          }
          subtitle="Minimal settlements, tappable pay links, and WhatsApp-friendly summaries — hisab kitab without the group-chat chaos."
          learnHref="/pay"
        >
          <AppScreenshot shot={SCREENSHOTS.pay} />
        </Panel>

        <Panel
          id="reports"
          variant="sand"
          eyebrow="Reports"
          title={
            <>
              Insights that
              <br />
              feel calm.
            </>
          }
          subtitle="Income vs expense, categories, and net worth — the same charts from Reports, presented with room to breathe."
          learnHref="/reports"
        >
          <AppScreenshot shot={SCREENSHOTS.reports} />
        </Panel>

        <Panel
          id="family"
          variant="card"
          eyebrow="Family"
          title={
            <>
              Shared homes.
              <br />
              Your keys.
            </>
          }
          subtitle="Profiles, avatars, encrypted SQLite homes, and app lock — multi-user finance that stays on your infrastructure."
          learnHref="/settings"
        >
          <AppScreenshot shot={SCREENSHOTS.settings} />
        </Panel>
      </div>

      <section className="sb-landing-closer">
        <div className="sb-landing-closer-glow" aria-hidden />
        <h2 className="sb-landing-closer-title font-display">Built for families. Hosted by you.</h2>
        <p className="sb-landing-closer-sub">
          SmartBudget syncs with Lovable, runs in Docker, and keeps the emerald-and-sand experience
          you already know from the app.
        </p>
        <Link
          to="/home"
          preload="intent"
          className="tap mt-6 inline-flex rounded-full bg-card px-6 py-3 text-sm font-bold text-primary shadow-[var(--shadow-lift)]"
        >
          Open SmartBudget
        </Link>
      </section>

      <footer className="sb-landing-footer">
        <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
          <p className="text-xs font-medium text-muted-foreground">
            © {new Date().getFullYear()} SmartBudget · Zero-based budgeting for Indian families
          </p>
          <div className="mt-3 flex flex-wrap gap-4 text-xs font-bold">
            <Link to="/home" className="text-primary hover:underline">App</Link>
            <a href="#budget" className="text-primary hover:underline">Features</a>
            <Link to="/settings" className="text-primary hover:underline">Settings</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
