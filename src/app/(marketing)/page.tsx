"use client";

import { SignUpButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { CheckoutButton } from "../../components/landing/CheckoutButton";

const proofItems = [
  {
    title: "Trace every step",
    description:
      "Keep formulas, assumptions, units, and intermediate results visible in one worksheet instead of scattered across cells or screenshots.",
  },
  {
    title: "Validate with the engine",
    description:
      "Each node is checked for unit consistency, constraint satisfaction, numeric residuals, and sanity before you trust the result.",
  },
  {
    title: "Own the file",
    description:
      "Desktop worksheets stay on your machine as JSON and can be exported to PDF, DOCX, or HTML whenever you need to share the work.",
  },
  {
    title: "Work without the cloud",
    description:
      "The desktop app runs offline after activation. AI help is optional, and the AI never performs the calculation.",
  },
];

const demoHighlights = [
  "See a real worksheet build from inputs to checked result.",
  "Watch ProveCalc flag a unit mismatch before it becomes a report problem.",
  "Follow the audit trail from symbolic expression to export-ready output.",
];

const featureItems = [
  {
    title: "Full audit trail",
    description:
      "Show formulas, variables, assumptions, and intermediate values in plain view so peer review starts from evidence instead of reconstruction.",
  },
  {
    title: "Unit intelligence",
    description:
      "Automatic conversion and dimensional analysis help catch the category of mistakes spreadsheets hide until late.",
  },
  {
    title: "AI-assisted structure",
    description:
      "AI can draft worksheet structure and notes. The compute engine still owns the math, so generated suggestions do not bypass verification.",
  },
  {
    title: "Fast symbolic compute",
    description:
      "SymPy + Pint give you exact symbolic workflows, goal solving, and unit-aware evaluation without turning the worksheet into a black box.",
  },
];

const trustItems = [
  {
    title: "Desktop compute is local",
    description:
      "The desktop app evaluates with a local SymPy + Pint sidecar process. Your mathematical content does not leave the machine for calculation.",
  },
  {
    title: "Files stay readable",
    description:
      "Worksheets are stored as open JSON and remain exportable and readable outside the app.",
  },
  {
    title: "Support is accountable",
    description:
      "Built by The Mnemosyne Research Institute in Arizona, with direct support at contact@themnemosyneresearchinstitute.com.",
  },
  {
    title: "Low purchase risk",
    description:
      "One-time license, 3 machine activations, 30-day refund, and no subscription server checks for desktop use after activation.",
  },
];

const useCases = [
  {
    title: "Mechanical sizing",
    description:
      "Document loads, geometry, material properties, and solved dimensions in a worksheet another engineer can review line by line.",
  },
  {
    title: "Civil load paths",
    description:
      "Keep tributary assumptions, conversions, combinations, and resulting checks in a single traceable calculation package.",
  },
  {
    title: "Process and units sanity checks",
    description:
      "Build worksheets where unit consistency is part of the workflow instead of an after-the-fact spot check.",
  },
];

const platformRows = [
  {
    label: "Where compute runs",
    web: "Hosted SymPy + Pint compute for the browser demo.",
    desktop: "Local SymPy + Pint sidecar on your machine.",
    ai: "Only when you choose an external model for drafting help.",
  },
  {
    label: "Where files live",
    web: "Browser local storage for demo worksheets.",
    desktop: "Local files you save anywhere on disk.",
    ai: "No file storage unless your provider stores prompts under its own policy.",
  },
  {
    label: "Internet requirement",
    web: "Required because the demo is hosted.",
    desktop: "Not required after license activation for core work.",
    ai: "Required only for non-local AI providers.",
  },
  {
    label: "What ProveCalc stores",
    web: "Account and purchase records; worksheets are not synced to ProveCalc servers.",
    desktop: "No telemetry or worksheet uploads.",
    ai: "ProveCalc does not proxy desktop AI calls; your provider receives the request directly.",
  },
];

export default function LandingPage() {
  return (
    <main>
      <section className="min-h-screen flex items-center pt-20">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 bg-[var(--stone-800)]/50 rounded-full px-4 py-1.5 text-sm text-[var(--stone-300)] mb-6">
              <span className="w-2 h-2 bg-[var(--copper)] rounded-full animate-pulse" />
              Free demo available
            </div>
            <h1
              className="text-5xl md:text-6xl font-bold leading-tight mb-6"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Engineering calculations
              <br />
              <span className="gradient-text">you can prove.</span>
            </h1>
            <p className="text-xl text-[var(--stone-400)] mb-8 leading-relaxed max-w-3xl">
              Calculation software for engineers who need unit-aware math,
              visible assumptions, and result lineage they can hand to a peer
              reviewer with confidence.
            </p>
            <div className="flex flex-wrap gap-4 mb-8">
              <SignedOut>
                <SignUpButton mode="modal">
                  <button className="bg-[var(--copper)] hover:bg-[var(--copper-dark)] px-6 py-3 rounded-lg font-medium transition-colors">
                    Try Free Demo
                  </button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <a
                  href="/app"
                  className="bg-[var(--copper)] hover:bg-[var(--copper-dark)] px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Open App
                </a>
              </SignedIn>
              <a
                href="#demo"
                className="bg-[var(--stone-800)] hover:bg-[var(--stone-700)] px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Watch a traced example
              </a>
              <a
                href="/pricing"
                className="border border-[var(--stone-700)] hover:border-[var(--stone-500)] px-6 py-3 rounded-lg font-medium transition-colors"
              >
                See Pricing
              </a>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-[var(--stone-400)]">
              <span className="glass-card rounded-full px-4 py-2">
                Desktop app runs offline after activation
              </span>
              <span className="glass-card rounded-full px-4 py-2">
                Open JSON worksheets with export to PDF, DOCX, and HTML
              </span>
              <span className="glass-card rounded-full px-4 py-2">
                AI is optional and never computes the result
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 border-t border-[var(--stone-800)]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2
              className="text-3xl font-bold mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Proof first
            </h2>
            <p className="text-[var(--stone-400)] text-lg">
              The product promise is simple: make the calculation readable,
              checkable, and portable enough that someone else can follow it.
            </p>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
            {proofItems.map((item) => (
              <InfoCard
                key={item.title}
                title={item.title}
                description={item.description}
              />
            ))}
          </div>
        </div>
      </section>

      <section id="demo" className="py-20 border-t border-[var(--stone-800)]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-10 items-center">
            <div>
              <h2
                className="text-3xl font-bold mb-4"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Watch ProveCalc catch the kinds of errors that usually hide in a sheet
              </h2>
              <p className="text-[var(--stone-400)] text-lg mb-6">
                Start with a real worksheet, then see how the engine keeps the
                structure reviewable instead of burying the logic.
              </p>
              <ul className="space-y-3">
                {demoHighlights.map((highlight) => (
                  <li
                    key={highlight}
                    className="flex items-start gap-3 text-[var(--stone-300)]"
                  >
                    <span className="text-[var(--copper)] mt-1">&#10003;</span>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative rounded-2xl overflow-hidden border border-[var(--stone-800)] shadow-2xl">
              <video
                controls
                preload="metadata"
                className="w-full aspect-video bg-[var(--stone-900)]"
              >
                <source src="/demo2.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 border-t border-[var(--stone-800)]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2
              className="text-3xl font-bold mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              The problem is not just math
            </h2>
            <p className="text-[var(--stone-400)] text-lg">
              Engineers are forced to choose between expensive subscription
              tools, opaque spreadsheets, and cloud-first workflows that make
              verification harder than it should be.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <ProblemCard
              title="Subscription pressure"
              description="Annual pricing and license-server dependency turn a core calculation tool into an ongoing operating risk."
            />
            <ProblemCard
              title="Black-box spreadsheets"
              description="Cell references hide logic, make review slow, and turn handoff into a scavenger hunt."
            />
            <ProblemCard
              title="Cloud-only workflows"
              description="Sensitive calculations and field work do not always belong behind an internet requirement."
            />
          </div>
        </div>
      </section>

      <section
        id="features"
        className="py-20 border-t border-[var(--stone-800)]"
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2
              className="text-3xl font-bold mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Built to be reviewed
            </h2>
            <p className="text-[var(--stone-400)] text-lg">
              ProveCalc is designed to help you show the reasoning, not just the answer.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {featureItems.map((item) => (
              <FeatureCard
                key={item.title}
                title={item.title}
                description={item.description}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 border-t border-[var(--stone-800)]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2
              className="text-3xl font-bold mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Where it fits
            </h2>
            <p className="text-[var(--stone-400)] text-lg">
              Early buyers usually need one of these three outcomes: clearer
              review packages, fewer unit mistakes, or a worksheet they can keep
              out of a spreadsheet.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {useCases.map((item) => (
              <InfoCard
                key={item.title}
                title={item.title}
                description={item.description}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 border-t border-[var(--stone-800)]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2
              className="text-3xl font-bold mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Why trust it
            </h2>
            <p className="text-[var(--stone-400)] text-lg">
              Buyers do not just need features. They need to know how the tool
              behaves when it matters.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 mb-10">
            {trustItems.map((item) => (
              <FeatureCard
                key={item.title}
                title={item.title}
                description={item.description}
              />
            ))}
          </div>
          <div className="glass-card rounded-2xl p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h3
                className="text-2xl font-bold mb-2"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Built by The Mnemosyne Research Institute
              </h3>
              <p className="text-[var(--stone-400)] max-w-2xl">
                Independent software built in Safford, Arizona. Support,
                licensing, and product questions go straight to the team that
                ships the product.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://themnemosyneresearchinstitute.com"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-[var(--stone-700)] hover:border-[var(--stone-500)] px-5 py-3 rounded-lg font-medium transition-colors"
              >
                Company Site
              </a>
              <a
                href="/contact"
                className="bg-[var(--copper)] hover:bg-[var(--copper-dark)] px-5 py-3 rounded-lg font-medium transition-colors"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 border-t border-[var(--stone-800)]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2
              className="text-3xl font-bold mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Web demo, desktop app, and AI each do different jobs
            </h2>
            <p className="text-[var(--stone-400)] text-lg">
              This is the operational model in plain language so buyers do not
              have to infer it from legal copy.
            </p>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[800px] border border-[var(--stone-800)] rounded-2xl overflow-hidden">
              <div className="grid grid-cols-[1.1fr_1fr_1fr_1fr] bg-[var(--stone-900)]/70">
                <TableHeaderCell>Question</TableHeaderCell>
                <TableHeaderCell>Web demo</TableHeaderCell>
                <TableHeaderCell>Desktop app</TableHeaderCell>
                <TableHeaderCell>AI assistant</TableHeaderCell>
              </div>
              {platformRows.map((row, index) => (
                <div
                  key={row.label}
                  className={`grid grid-cols-[1.1fr_1fr_1fr_1fr] ${
                    index % 2 === 0 ? "bg-[var(--stone-950)]" : "bg-[var(--stone-900)]/30"
                  }`}
                >
                  <TableCell strong>{row.label}</TableCell>
                  <TableCell>{row.web}</TableCell>
                  <TableCell>{row.desktop}</TableCell>
                  <TableCell>{row.ai}</TableCell>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 border-t border-[var(--stone-800)]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2
              className="text-3xl font-bold mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Predictable pricing
            </h2>
            <p className="text-[var(--stone-400)] text-lg">
              One license, one price, local files, and no subscription to keep
              using the version you already bought.
            </p>
          </div>
          <div className="max-w-3xl mx-auto glass-card rounded-2xl p-8 text-center">
            <div className="inline-flex items-center gap-2 bg-[var(--copper)]/15 text-[var(--copper-light)] rounded-full px-4 py-1.5 text-sm font-medium mb-5">
              Lifetime desktop license
            </div>
            <div className="text-5xl font-bold text-[var(--copper-light)] mb-3">
              $200
            </div>
            <p className="text-[var(--stone-400)] text-lg mb-8">
              Includes 3 activations, free updates for life, and a 30-day
              money-back guarantee.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <CheckoutButton
                label="Buy ProveCalc - $200"
                className="inline-block bg-[var(--copper)] hover:bg-[var(--copper-dark)] px-6 py-3 rounded-lg font-medium transition-colors"
              />
              <a
                href="/pricing"
                className="border border-[var(--stone-700)] hover:border-[var(--stone-500)] px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Read pricing details
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 border-t border-[var(--stone-800)]">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2
            className="text-3xl font-bold mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Try ProveCalc free
          </h2>
          <p className="text-[var(--stone-400)] text-lg mb-8">
            No credit card. No install. Open the browser demo and see how the
            worksheet model feels before you buy the desktop app.
          </p>
          <SignedOut>
            <SignUpButton mode="modal">
              <button className="bg-[var(--copper)] hover:bg-[var(--copper-dark)] px-8 py-4 rounded-lg font-medium text-lg transition-colors">
                Start Free Demo
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <a
              href="/app"
              className="inline-block bg-[var(--copper)] hover:bg-[var(--copper-dark)] px-8 py-4 rounded-lg font-medium text-lg transition-colors"
            >
              Open App
            </a>
          </SignedIn>
        </div>
      </section>
    </main>
  );
}

function ProblemCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-[var(--stone-400)]">{description}</p>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="glass-card rounded-xl p-8">
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-[var(--stone-400)]">{description}</p>
    </div>
  );
}

function InfoCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-[var(--stone-400)] leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function TableHeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 text-sm font-semibold text-white border-b border-[var(--stone-800)]">
      {children}
    </div>
  );
}

function TableCell({
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
