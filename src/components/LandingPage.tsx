import { Link } from "@tanstack/react-router";
import { FeatureShowcase } from "@/components/FeatureShowcase";
import { Toaster } from "@/components/ui/sonner";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function LandingPage() {
  useTheme();

  return (
    <div className="min-h-screen bg-background">
      <header
        className={cn(
          "sticky top-0 z-50 border-b border-border/50 bg-background/75 backdrop-blur-xl",
          "pt-[env(safe-area-inset-top)]",
        )}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-8">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <span className="num flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl gradient-primary text-sm font-bold text-primary-foreground shadow-sm">
              ₹
            </span>
            <span className="truncate font-display text-[15px] font-bold tracking-tight">SmartBudget</span>
          </Link>
          <nav className="flex shrink-0 items-center gap-2">
            <Link
              to="/home"
              preload="intent"
              className="tap hidden rounded-full px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              to="/home"
              preload="intent"
              className="tap inline-flex items-center rounded-full gradient-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm"
            >
              Open app
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <FeatureShowcase bleed={false} />
      </main>

      <footer className="border-t border-border/60 px-4 py-10 text-center md:px-8">
        <p className="text-xs font-medium text-muted-foreground">
          SmartBudget · Self-hosted zero-based budgeting for Indian families
        </p>
        <Link to="/home" className="tap mt-3 inline-block text-sm font-bold text-primary">
          Continue to your budget →
        </Link>
      </footer>

      <Toaster position="top-center" richColors />
    </div>
  );
}
