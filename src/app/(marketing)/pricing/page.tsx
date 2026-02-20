"use client";

import type { Metadata } from "next";
import { SignUpButton, SignedIn, SignedOut } from "@clerk/nextjs";

// Note: metadata export won't work with "use client" in the same file.
// Move to a layout.tsx if needed, or use generateMetadata in a server component wrapper.

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Try ProveCalc in your browser",
    features: [
      "3 worksheets",
      "Browser-based (no install)",
      "Core compute engine",
      "Unit checking & conversion",
      "Basic plotting",
    ],
    cta: "free",
    highlighted: false,
  },
  {
    name: "Standard",
    price: "$200",
    period: "one-time",
    description: "For individual engineers",
    features: [
      "Unlimited worksheets",
      "Desktop app (Windows, macOS, Linux)",
      "100% offline capable",
      "AI assistant (bring your own key)",
      "PDF & DOCX export",
      "Solve goals & system analysis",
      "Templates library",
      "3 machine activations",
      "1 year of updates",
    ],
    cta: "buy",
    highlighted: true,
  },
  {
    name: "Professional",
    price: "$500",
    period: "one-time",
    description: "For power users & small teams",
    features: [
      "Everything in Standard",
      "Priority email support",
      "Team templates (shared)",
      "5 machine activations",
      "1 year of updates",
    ],
    cta: "buy",
    highlighted: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "contact us",
    description: "For organizations & regulated industries",
    features: [
      "Everything in Professional",
      "SSO / SAML integration",
      "Audit log export",
      "Dedicated support",
      "Unlimited machines",
      "Custom deployment options",
      "Volume licensing",
    ],
    cta: "contact",
    highlighted: false,
  },
];

const faq = [
  {
    q: "Is this really a one-time payment?",
    a: "Yes. Standard and Professional licenses are one-time purchases. You own the software forever. The license includes 1 year of updates; after that, you can continue using the version you have or renew for continued updates.",
  },
  {
    q: "What does 'bring your own key' mean for AI?",
    a: "ProveCalc's AI assistant uses OpenRouter to access language models. You provide your own API key, so you control costs and model selection. The AI helps structure your worksheets but never performs calculations — the SymPy engine handles all math.",
  },
  {
    q: "Can I use it offline?",
    a: "The desktop app works 100% offline after initial activation. No internet required for calculations, file management, or any core functionality.",
  },
  {
    q: "What if I need more machines?",
    a: "You can deactivate a machine from one device and activate on another at any time. Need more simultaneous activations? Upgrade to Professional (5) or Enterprise (unlimited).",
  },
  {
    q: "How does the web demo compare to the desktop app?",
    a: "The web demo uses the same SymPy compute engine as the desktop app. It's limited to 3 worksheets and browser-local storage. The desktop app adds unlimited worksheets, local file management, offline use, AI assistant, and export to PDF/DOCX.",
  },
  {
    q: "Do you offer refunds?",
    a: "Yes — 30-day money-back guarantee on all desktop licenses, no questions asked.",
  },
];

export default function PricingPage() {
  return (
    <main className="pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h1
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Simple, honest pricing
          </h1>
          <p className="text-xl text-[var(--stone-400)]">
            One price. No subscriptions. No per-seat fees. Your tool, forever.
          </p>
        </div>

        {/* Tier Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-xl p-6 flex flex-col relative ${
                tier.highlighted
                  ? "bg-gradient-to-br from-[var(--copper)]/20 to-[var(--copper-light)]/10 border border-[var(--copper)]/30"
                  : "glass-card"
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--copper)] text-xs font-bold px-3 py-1 rounded-full">
                  MOST POPULAR
                </div>
              )}
              <h3
                className={`text-sm uppercase tracking-wide mb-2 ${
                  tier.highlighted
                    ? "text-[var(--copper-light)]"
                    : "text-[var(--stone-400)]"
                }`}
              >
                {tier.name}
              </h3>
              <div
                className={`text-4xl font-bold mb-1 ${
                  tier.highlighted ? "text-[var(--copper-light)]" : ""
                }`}
              >
                {tier.price}
              </div>
              <p className="text-sm text-[var(--stone-500)] mb-4">
                {tier.period}
              </p>
              <p className="text-sm text-[var(--stone-400)] mb-6">
                {tier.description}
              </p>

              <ul className="space-y-2 mb-8 flex-1">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-[var(--stone-300)]"
                  >
                    <span className="text-[var(--copper)] mt-0.5 shrink-0">
                      &#10003;
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              {tier.cta === "free" && (
                <>
                  <SignedOut>
                    <SignUpButton mode="modal">
                      <button className="w-full bg-[var(--stone-800)] hover:bg-[var(--stone-700)] px-4 py-3 rounded-lg text-sm font-medium transition-colors">
                        Get Started Free
                      </button>
                    </SignUpButton>
                  </SignedOut>
                  <SignedIn>
                    <a
                      href="/app"
                      className="block w-full bg-[var(--stone-800)] hover:bg-[var(--stone-700)] px-4 py-3 rounded-lg text-sm font-medium transition-colors text-center"
                    >
                      Open App
                    </a>
                  </SignedIn>
                </>
              )}
              {tier.cta === "buy" && (
                <a
                  href="/download"
                  className={`block w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors text-center ${
                    tier.highlighted
                      ? "bg-[var(--copper)] hover:bg-[var(--copper-dark)]"
                      : "bg-[var(--stone-800)] hover:bg-[var(--stone-700)]"
                  }`}
                >
                  Download & Buy
                </a>
              )}
              {tier.cta === "contact" && (
                <a
                  href="mailto:hello@provecalc.com"
                  className="block w-full bg-[var(--stone-800)] hover:bg-[var(--stone-700)] px-4 py-3 rounded-lg text-sm font-medium transition-colors text-center"
                >
                  Contact Sales
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Competitor Comparison */}
        <div className="max-w-4xl mx-auto mb-20">
          <h2
            className="text-2xl font-bold text-center mb-8"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            How we compare
          </h2>
          <p className="text-center text-[var(--stone-400)] mb-8">
            5-year total cost of ownership
          </p>
          <div className="grid md:grid-cols-4 gap-4">
            <CompareCard
              name="Mathcad Prime"
              price="$13,500"
              sub="$2,700/yr x 5"
              variant="expensive"
            />
            <CompareCard
              name="Maple Flow"
              price="$12,475"
              sub="$2,495/yr x 5"
              variant="expensive"
            />
            <CompareCard
              name="Blockpad"
              price="$2,400"
              sub="$480/yr x 5"
              variant="mid"
            />
            <CompareCard
              name="ProveCalc"
              price="$200"
              sub="One-time. Forever."
              variant="ours"
            />
          </div>
          <p className="text-center text-[var(--stone-500)] mt-6 text-sm">
            That&apos;s 67x less than Mathcad over 5 years.
          </p>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2
            className="text-2xl font-bold text-center mb-8"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Frequently asked questions
          </h2>
          <div className="space-y-6">
            {faq.map((item) => (
              <div
                key={item.q}
                className="glass-card rounded-xl p-6"
              >
                <h3 className="font-semibold mb-2">{item.q}</h3>
                <p className="text-sm text-[var(--stone-400)]">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function CompareCard({
  name,
  price,
  sub,
  variant,
}: {
  name: string;
  price: string;
  sub: string;
  variant: "expensive" | "mid" | "ours";
}) {
  if (variant === "ours") {
    return (
      <div className="bg-gradient-to-br from-[var(--copper)]/20 to-[var(--copper-light)]/10 border border-[var(--copper)]/30 rounded-xl p-6 text-center relative">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--copper)] text-xs font-bold px-3 py-1 rounded-full">
          LIFETIME
        </div>
        <h3 className="text-[var(--copper-light)] text-sm uppercase tracking-wide mb-2">
          {name}
        </h3>
        <div className="text-3xl font-bold text-[var(--copper-light)] mb-2">
          {price}
        </div>
        <p className="text-[var(--stone-400)] text-sm">{sub}</p>
      </div>
    );
  }
  const priceColor =
    variant === "expensive" ? "text-red-400" : "text-orange-400";
  return (
    <div className="glass-card rounded-xl p-6 text-center">
      <h3 className="text-[var(--stone-500)] text-sm uppercase tracking-wide mb-2">
        {name}
      </h3>
      <div className={`text-3xl font-bold ${priceColor} mb-2`}>{price}</div>
      <p className="text-[var(--stone-500)] text-sm">{sub}</p>
    </div>
  );
}
