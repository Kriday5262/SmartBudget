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
    <figure
      className={cn("apple-com-shot", size === "hero" && "apple-com-shot-hero")}
    >
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
          <AppScreenshot shot={SCREENSHOTS.home} priority size="hero" />
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
          <AppScreenshot shot={SCREENSHOTS.budget} />
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
          <AppScreenshot shot={SCREENSHOTS.pay} />
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
          <AppScreenshot shot={SCREENSHOTS.reports} />
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
          <AppScreenshot shot={SCREENSHOTS.settings} />
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
