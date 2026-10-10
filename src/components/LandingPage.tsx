import { SmartBudgetLanding } from "@/components/SmartBudgetLanding";
import { Toaster } from "@/components/ui/sonner";
import { useTheme } from "@/lib/theme";

/** Public marketing site at `/` — SmartBudget brand, outside AppShell. */
export function LandingPage() {
  useTheme();

  return (
    <>
      <SmartBudgetLanding />
      <Toaster position="top-center" richColors />
    </>
  );
}
