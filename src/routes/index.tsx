import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/components/LandingPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SmartBudget — Family budgeting with AI & UPI" },
      {
        name: "description",
        content:
          "Zero-based family budgeting in rupees: assign every rupee, split bills over UPI, and get calm insights — self-hosted on your terms.",
      },
      { property: "og:title", content: "SmartBudget — Family budgeting with AI & UPI" },
      {
        property: "og:description",
        content:
          "Apple-polished feature tour: zero-based budgeting, SmartPay, reports, and secure family sync.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});
