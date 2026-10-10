import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing: $200 Once, No Subscription",
  description:
    "One payment of $200 for the ProveCalc desktop app on Windows, macOS, and Linux. No subscription, no activation server, free updates.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "ProveCalc Pricing: $200 Once, No Subscription",
    description:
      "One payment for the desktop engineering worksheet. No subscription, no activation server.",
    url: "/pricing",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "ProveCalc worksheet with verified inputs and results" }],
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
