import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { FeatureShowcase } from "@/components/FeatureShowcase";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — SmartBudget" },
      {
        name: "description",
        content:
          "Discover SmartBudget: zero-based family budgeting, UPI SmartPay, reports, and secure multi-home sync.",
      },
      { property: "og:title", content: "Features — SmartBudget" },
      {
        property: "og:description",
        content: "Apple-inspired feature tour of zero-based budgeting, SmartPay, and family finance.",
      },
    ],
  }),
  component: FeaturesPage,
});

function FeaturesPage() {
  return (
    <div className="relative">
      <Link
        to="/settings"
        preload="intent"
        className="tap mb-2 inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Settings
      </Link>
      <FeatureShowcase />
    </div>
  );
}
