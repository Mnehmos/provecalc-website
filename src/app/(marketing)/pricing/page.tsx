"use client";

const features = [
  "Unlimited worksheets",
  "Desktop app for Windows, macOS, and Linux",
  "Offline-capable after activation",
  "AI assistant with your own API key",
  "PDF, DOCX, and HTML export",
  "Solve goals and system analysis",
  "Templates library",
  "Existing-customer license retrieval",
  "Hardened signed-build release notifications",
];

const assurances = [
  {
    title: "Design-partner access",
    description:
      "Join the release list while desktop delivery and entitlement controls complete their final audit.",
  },
  {
    title: "Readable files",
    description:
      "Worksheets are local JSON files, and you can export them to PDF, DOCX, or HTML whenever you need a handoff artifact.",
  },
  {
    title: "Local desktop workflow",
    description:
      "The read-only web preview does not compute. Approved desktop delivery will include its own activation instructions.",
  },
  {
    title: "Honest release boundary",
    description:
      "No checkout or public desktop download is enabled during containment; existing license records remain retrievable.",
  },
];

const comparisonRows = [
  {
    label: "Billing model",
    subscription: "Usually annual subscription or seat-based renewal.",
    spreadsheet: "Already owned, but labor-intensive and hard to review.",
    provecalc: "Read-only preview; signed desktop delivery pending.",
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
    q: "Can I get the desktop build now?",
    a: "Not during containment. Request release notifications while the hardened signed build and entitlement ledger complete audit.",
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
    q: "Can existing customers retrieve license records?",
    a: "Yes. Sign in to retrieve an existing license record; the older public release is not linked while the release gate is open.",
  },
];

export default function PricingPage() {
  return (
    <main className="pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h1
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Design-partner access
          </h1>
          <p className="text-xl text-[var(--stone-400)]">
            The web surface is a read-only preview while signed desktop delivery
            and paid entitlement controls complete audit.
          </p>
        </div>

        <div className="max-w-lg mx-auto mb-20">
          <div className="bg-gradient-to-br from-[var(--copper)]/20 to-[var(--copper-light)]/10 border border-[var(--copper)]/30 rounded-xl p-8 text-center relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--copper)] text-xs font-bold px-3 py-1 rounded-full">
              CONTAINMENT PREVIEW
              </div>
            <div className="text-4xl font-bold text-[var(--copper-light)] mb-2 mt-2">
              Signed build pending
            </div>
            <p className="text-[var(--stone-400)] mb-8">
              No checkout is enabled. Request notification when the release gate passes.
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

            <a
              href="mailto:contact@themnemosyneresearchinstitute.com?subject=ProveCalc%20design-partner%20release%20notification"
              className="block w-full bg-[var(--copper)] hover:bg-[var(--copper-dark)] px-4 py-3 rounded-lg font-medium transition-colors text-center"
            >
              Request release notification
            </a>
            <p className="text-xs text-[var(--stone-500)] mt-3">
              Existing customers can retrieve license records while signed in.
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
