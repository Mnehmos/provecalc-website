"use client";

import { CheckoutButton } from "../../../components/landing/CheckoutButton";

const features = [
  "Unlimited worksheets",
  "Desktop app (Windows, macOS, Linux)",
  "100% offline capable",
  "AI assistant (bring your own key)",
  "PDF & DOCX export",
  "Solve goals & system analysis",
  "Templates library",
  "3 machine activations",
  "1 year of updates included",
];

const faq = [
  {
    q: "Is this really a one-time payment?",
    a: "Yes. You pay $200 once and own the software forever. The license includes 1 year of updates; after that, you can continue using the version you have or renew for continued updates.",
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
    a: "Each license key activates on up to 3 machines. You can deactivate a machine from one device and activate on another at any time. Need more? Buy additional keys.",
  },
  {
    q: "Do you offer refunds?",
    a: "Yes — 30-day money-back guarantee, no questions asked.",
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
            One product. One price. No subscriptions. No per-seat fees.
          </p>
        </div>

        {/* Single Product Card */}
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
            />
            <p className="text-xs text-[var(--stone-500)] mt-3">
              30-day money-back guarantee
            </p>
          </div>
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
