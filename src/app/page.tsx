"use client";

import { SignUpButton, SignedIn, SignedOut } from "@clerk/nextjs";
import NavAuth from "../components/NavAuth";

export default function LandingPage() {
  return (
    <>
      {/* Marketing Nav */}
      <nav className="fixed top-0 w-full z-50 bg-[var(--stone-950)]/80 backdrop-blur-md border-b border-[var(--stone-800)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <a href="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="ProveCalc" className="w-8 h-8" />
            <span className="text-xl font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              ProveCalc
            </span>
          </a>
          <div className="flex items-center gap-4">
            <NavAuth />
          </div>
        </div>
      </nav>

    <main>
      {/* Hero */}
      <section className="min-h-screen flex items-center pt-20">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-[var(--stone-800)]/50 rounded-full px-4 py-1.5 text-sm text-[var(--stone-300)] mb-6">
              <span className="w-2 h-2 bg-[var(--copper)] rounded-full animate-pulse" />
              Free Demo Available
            </div>
            <h1
              className="text-5xl md:text-6xl font-bold leading-tight mb-6"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Engineering calculations
              <br />
              <span className="gradient-text">you can prove.</span>
            </h1>
            <p className="text-xl text-[var(--stone-400)] mb-8 leading-relaxed">
              Professional calculation software with full audit trails. Every
              formula verified. Every unit checked. Every step traceable.
            </p>
            <div className="flex flex-wrap gap-4 mb-12">
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
                Watch Demo
              </a>
              <a
                href="#features"
                className="border border-[var(--stone-700)] hover:border-[var(--stone-500)] px-6 py-3 rounded-lg font-medium transition-colors"
              >
                See Features
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Video */}
      <section id="demo" className="py-20 border-t border-[var(--stone-800)]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2
              className="text-3xl font-bold mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              See it in action
            </h2>
            <p className="text-[var(--stone-400)] text-lg">
              Watch how ProveCalc handles real engineering calculations.
            </p>
          </div>
          <div className="relative rounded-2xl overflow-hidden border border-[var(--stone-800)] shadow-2xl">
            <video
              controls
              preload="metadata"
              className="w-full aspect-video bg-[var(--stone-900)]"
            >
              <source src="/demo.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-20 border-t border-[var(--stone-800)]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2
              className="text-3xl font-bold mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              The engineering calculation crisis
            </h2>
            <p className="text-[var(--stone-400)] text-lg">
              Mathcad costs $2,700/year. Excel hides your formulas. Spreadsheets
              break silently. You deserve better.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <ProblemCard
              title="Subscription Trap"
              description="Enterprise tools charge $2,700+/year forever. Stop renting your critical tools."
            />
            <ProblemCard
              title="Black Box Math"
              description='Spreadsheets hide formulas in cells. When auditors ask "show your work" — you can&apos;t.'
            />
            <ProblemCard
              title="Cloud Dependency"
              description="Your calculations shouldn't require an internet connection or live on someone else's server."
            />
          </div>
        </div>
      </section>

      {/* Features */}
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
              Glass box engineering
            </h2>
            <p className="text-[var(--stone-400)] text-lg">
              Every calculation visible. Every step verifiable. Every result
              provable.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <FeatureCard
              title="Full Audit Trail"
              description="Every formula, every variable, every intermediate result captured and traceable. Built for regulatory compliance and peer review."
            />
            <FeatureCard
              title="Unit Intelligence"
              description="Automatic unit conversion and dimensional analysis. Catch errors before they become disasters."
            />
            <FeatureCard
              title="AI-Assisted"
              description="AI builds your worksheet structure — but never computes. Every claim is verified by the engine. Trust but verify."
            />
            <FeatureCard
              title="Blazing Fast"
              description="SymPy compute engine with sub-second evaluation. No lag, no waiting, no spinning wheels. Just results."
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 border-t border-[var(--stone-800)]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2
              className="text-3xl font-bold mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Stop paying rent
            </h2>
            <p className="text-[var(--stone-400)] text-lg">
              5-year total cost of ownership. The math speaks for itself.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            <PriceCard name="Mathcad Prime" price="$13,500" sub="$2,700/yr x 5 years" variant="expensive" />
            <PriceCard name="Maple Flow" price="$12,475" sub="$2,495/yr x 5 years" variant="expensive" />
            <PriceCard name="Blockpad" price="$2,400" sub="$480/yr x 5 years" variant="mid" />
            <PriceCard name="ProveCalc" price="$200" sub="One-time payment. Forever." variant="ours" />
          </div>
          <p className="text-center text-[var(--stone-500)] mt-8 text-sm">
            That&apos;s 67x less than Mathcad over 5 years.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-[var(--stone-800)]">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2
            className="text-3xl font-bold mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Try ProveCalc free
          </h2>
          <p className="text-[var(--stone-400)] text-lg mb-8">
            No credit card. No install. Just open your browser and start
            calculating.
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

      {/* Footer */}
      <footer className="py-12 border-t border-[var(--stone-800)]">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="" className="w-6 h-6" />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif" }} className="font-semibold">
              ProveCalc
            </span>
          </div>
          <p className="text-[var(--stone-500)] text-sm">
            &copy; 2026 ProveCalc. Built in Arizona.
          </p>
          <div className="flex gap-6 text-[var(--stone-500)] text-sm">
            <a href="mailto:hello@provecalc.com" className="hover:text-[var(--copper)] transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </main>
    </>
  );
}

function ProblemCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-[var(--stone-400)]">{description}</p>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="glass-card rounded-xl p-8">
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-[var(--stone-400)]">{description}</p>
    </div>
  );
}

function PriceCard({
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
        <h3 className="text-[var(--copper-light)] text-sm uppercase tracking-wide mb-2">{name}</h3>
        <div className="text-3xl font-bold text-[var(--copper-light)] mb-2">{price}</div>
        <p className="text-[var(--stone-400)] text-sm">{sub}</p>
      </div>
    );
  }
  const priceColor = variant === "expensive" ? "text-red-400" : "text-orange-400";
  return (
    <div className="glass-card rounded-xl p-6 text-center">
      <h3 className="text-[var(--stone-500)] text-sm uppercase tracking-wide mb-2">{name}</h3>
      <div className={`text-3xl font-bold ${priceColor} mb-2`}>{price}</div>
      <p className="text-[var(--stone-500)] text-sm">{sub}</p>
    </div>
  );
}
