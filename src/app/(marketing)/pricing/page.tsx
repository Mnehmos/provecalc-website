"use client";

import { useSearchParams } from "next/navigation";
import { CheckoutButton } from "../../../components/landing/CheckoutButton";

const features = [
  "Unlimited worksheets",
  "Desktop app for Windows, macOS, and Linux",
  "Offline-capable after activation",
  "AI assistant with your own API key",
  "PDF, DOCX, and HTML export",
  "Solve goals and system analysis",
  "Templates library",
  "3 machine activations",
  "Free updates for life",
];

const assurances = [
  {
    title: "Perpetual license",
    description:
      "You buy the desktop app once, keep it forever, and receive ongoing updates without a renewal fee.",
  },
  {
    title: "Readable files",
    description:
      "Worksheets are local JSON files, and you can export them to PDF, DOCX, or HTML whenever you need a handoff artifact.",
  },
  {
    title: "Simple activation",
    description:
      "Each key activates on up to 3 machines, and you can move a seat by deactivating one device and activating another.",
  },
  {
    title: "Low buyer risk",
    description:
      "30-day money-back guarantee and direct support from the same team that builds the product.",
  },
];

const comparisonRows = [
  {
    label: "Billing model",
    subscription: "Usually annual subscription or seat-based renewal.",
    spreadsheet: "Already owned, but labor-intensive and hard to review.",
    provecalc: "$200 one-time desktop license.",
  },
  {
    label: "Traceability",
    subscription: "Varies by product and workflow.",
    spreadsheet: "Manual and easy to lose in formulas or hidden cells.",
    provecalc: "Worksheet-native audit trail with visible intermediate steps.",
  },
  {
    label: "File ownership",
    subscription: "Often tied to product-specific formats or vendor lifecycle.",
    spreadsheet: "Portable, but logic is fragile and easy to separate from context.",
    provecalc: "Local JSON plus export to PDF, DOCX, and HTML.",
  },
  {
    label: "Offline use",
    subscription: "Depends on licensing and deployment model.",
    spreadsheet: "Yes, but without built-in verification.",
    provecalc: "Desktop app runs offline after activation.",
  },
  {
    label: "AI workflow",
    subscription: "Vendor-specific or unavailable.",
    spreadsheet: "Usually external add-ins or manual prompting.",
    provecalc: "Optional BYO key. AI drafts structure, engine computes.",
  },
];

const faq = [
  {
    q: "Is this really a one-time payment?",
    a: "Yes. You pay $200 once, own the desktop license forever, and updates are included for life.",
  },
  {
    q: "What does 'bring your own key' mean for AI?",
    a: "You choose and pay for the AI provider directly. ProveCalc sends prompts to that provider only when you use AI features, and the AI never performs the actual calculation.",
  },
  {
    q: "Can I use it offline?",
    a: "Yes. The desktop app works offline after initial activation. Core calculations, files, and exports do not need an internet connection.",
  },
  {
    q: "What happens to my files over time?",
    a: "Your files stay on your machine as JSON and remain exportable. Updates do not change ownership of your worksheets, and there is no renewal gate on access to your existing work.",
  },
  {
    q: "Do you offer refunds?",
    a: "Yes. Every desktop license comes with a 30-day money-back guarantee.",
  },
];

export default function PricingPage() {
  const searchParams = useSearchParams();
  const isTest = searchParams.get("test") === "1";

  return (
    <main className="pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h1
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Simple, honest pricing
          </h1>
          <p className="text-xl text-[var(--stone-400)]">
            One product. One price. No subscriptions to keep using the version
            you already bought.
          </p>
        </div>

        <div className="max-w-lg mx-auto mb-20">
          <div className="bg-gradient-to-br from-[var(--copper)]/20 to-[var(--copper-light)]/10 border border-[var(--copper)]/30 rounded-xl p-8 text-center relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--copper)] text-xs font-bold px-3 py-1 rounded-full">
              LIFETIME LICENSE
            </div>
            <div className="text-5xl font-bold text-[var(--copper-light)] mb-2 mt-2">
              $200
            </div>
            <p className="text-[var(--stone-400)] mb-8">
              One-time payment. Yours forever.
            </p>

            <ul className="text-left space-y-3 mb-8">
              {features.map((feature) => (
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

            <CheckoutButton
              className="block w-full bg-[var(--copper)] hover:bg-[var(--copper-dark)] px-4 py-3 rounded-lg font-medium transition-colors text-center"
              test={isTest}
              label={isTest ? "Test Purchase - $1" : "Buy Now"}
            />
            {isTest && (
              <p className="text-xs text-yellow-400 mt-3 font-semibold">
                TEST MODE - $1 charge only
              </p>
            )}
            <p className="text-xs text-[var(--stone-500)] mt-3">
              30-day money-back guarantee
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-20">
          {assurances.map((item) => (
            <div key={item.title} className="glass-card rounded-xl p-6">
              <h2
                className="text-xl font-semibold mb-2"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {item.title}
              </h2>
              <p className="text-sm text-[var(--stone-400)] leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        <div className="max-w-5xl mx-auto mb-20">
          <h2
            className="text-2xl font-bold text-center mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Compare the tradeoff, not a shaky price scrape
          </h2>
          <p className="text-center text-[var(--stone-400)] mb-8 max-w-3xl mx-auto">
            Pricing and plan structures move around. The operational differences
            do not. This comparison keeps the value proposition on defensible ground.
          </p>
          <div className="overflow-x-auto">
            <div className="min-w-[820px] border border-[var(--stone-800)] rounded-2xl overflow-hidden">
              <div className="grid grid-cols-[1.1fr_1fr_1fr_1fr] bg-[var(--stone-900)]/70">
                <HeaderCell>Question</HeaderCell>
                <HeaderCell>Subscription math tools</HeaderCell>
                <HeaderCell>Spreadsheet workflow</HeaderCell>
                <HeaderCell>ProveCalc</HeaderCell>
              </div>
              {comparisonRows.map((row, index) => (
                <div
                  key={row.label}
                  className={`grid grid-cols-[1.1fr_1fr_1fr_1fr] ${
                    index % 2 === 0 ? "bg-[var(--stone-950)]" : "bg-[var(--stone-900)]/30"
                  }`}
                >
                  <BodyCell strong>{row.label}</BodyCell>
                  <BodyCell>{row.subscription}</BodyCell>
                  <BodyCell>{row.spreadsheet}</BodyCell>
                  <BodyCell>{row.provecalc}</BodyCell>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto">
          <h2
            className="text-2xl font-bold text-center mb-8"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Frequently asked questions
          </h2>
          <div className="space-y-6">
            {faq.map((item) => (
              <div key={item.q} className="glass-card rounded-xl p-6">
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

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 text-sm font-semibold text-white border-b border-[var(--stone-800)]">
      {children}
    </div>
  );
}

function BodyCell({
  children,
  strong = false,
}: {
  children: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div
      className={`p-4 text-sm leading-relaxed border-b border-[var(--stone-800)] ${
        strong ? "font-medium text-white" : "text-[var(--stone-300)]"
      }`}
    >
      {children}
    </div>
  );
}
