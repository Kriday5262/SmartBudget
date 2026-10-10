import { AppleComLanding } from "@/components/AppleComLanding";
import { Toaster } from "@/components/ui/sonner";
import { useTheme } from "@/lib/theme";

/** Public marketing site at `/` — Apple.com-style, outside AppShell. */
export function LandingPage() {
  useTheme();

  return (
    <>
      <AppleComLanding />
      <Toaster position="top-center" richColors />
    </>
  );
}
