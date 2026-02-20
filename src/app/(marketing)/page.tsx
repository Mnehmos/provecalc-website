"use client";

import { SignUpButton, SignedIn, SignedOut } from "@clerk/nextjs";

export default function LandingPage() {
  return (
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
                href="/download"
                className="border border-[var(--stone-700)] hover:border-[var(--stone-500)] px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Download Desktop
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
              <source src="/demo2.mp4" type="video/mp4" />
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

      {/* Tech Specs */}
      <section className="py-20 border-t border-[var(--stone-800)]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2
              className="text-3xl font-bold mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Built for engineers
            </h2>
            <p className="text-[var(--stone-400)] text-lg">
              Not a spreadsheet with a coat of paint. A purpose-built calculation engine.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <TechCard
              title="SymPy Engine"
              description="Symbolic mathematics library trusted by researchers worldwide. Exact solutions, not floating-point approximations."
            />
            <TechCard
              title="Pint Unit System"
              description="Dimensional analysis catches unit errors automatically. Supports 100+ unit systems with conversion."
            />
            <TechCard
              title="4-Gate Verification"
              description="Unit consistency, constraint satisfaction, numeric residual, and sanity checks. Every node must pass all four."
            />
            <TechCard
              title="Open JSON Format"
              description="Your worksheets are yours. Open, inspectable JSON files. Export to PDF, DOCX, or HTML anytime."
            />
            <TechCard
              title="100% Offline"
              description="Desktop app works without internet. No cloud dependency. No subscription server check. Your tool, your terms."
            />
            <TechCard
              title="AI That Never Computes"
              description="LLM proposes structure. Engine validates results. The AI never touches your numbers — it just helps you organize."
            />
          </div>
        </div>
      </section>

      {/* Social Proof / Stats */}
      <section className="py-16 border-t border-[var(--stone-800)] bg-[var(--stone-900)]/30">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <StatCard value="816" label="Tests passing" />
            <StatCard value="43K" label="Lines of code" />
            <StatCard value="100%" label="Offline capable" />
            <StatCard value="$200" label="Lifetime license" />
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
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
              One price. Forever yours. No subscriptions.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="glass-card rounded-xl p-6 text-center">
              <h3 className="text-[var(--stone-400)] text-sm uppercase tracking-wide mb-2">Free</h3>
              <div className="text-3xl font-bold mb-2">$0</div>
              <p className="text-[var(--stone-500)] text-sm mb-4">Web demo forever</p>
              <ul className="text-left text-sm text-[var(--stone-400)] space-y-2 mb-6">
                <li>3 worksheets</li>
                <li>Browser-based</li>
                <li>Core compute engine</li>
              </ul>
              <SignedOut>
                <SignUpButton mode="modal">
                  <button className="w-full bg-[var(--stone-800)] hover:bg-[var(--stone-700)] px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    Get Started
                  </button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <a href="/app" className="block w-full bg-[var(--stone-800)] hover:bg-[var(--stone-700)] px-4 py-2 rounded-lg text-sm font-medium transition-colors text-center">
                  Open App
                </a>
              </SignedIn>
            </div>

            <div className="bg-gradient-to-br from-[var(--copper)]/20 to-[var(--copper-light)]/10 border border-[var(--copper)]/30 rounded-xl p-6 text-center relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--copper)] text-xs font-bold px-3 py-1 rounded-full">
                MOST POPULAR
              </div>
              <h3 className="text-[var(--copper-light)] text-sm uppercase tracking-wide mb-2">Standard</h3>
              <div className="text-3xl font-bold text-[var(--copper-light)] mb-2">$200</div>
              <p className="text-[var(--stone-400)] text-sm mb-4">One-time. Forever.</p>
              <ul className="text-left text-sm text-[var(--stone-400)] space-y-2 mb-6">
                <li>Unlimited worksheets</li>
                <li>Desktop app (offline)</li>
                <li>AI assistant (BYOK)</li>
                <li>PDF & DOCX export</li>
                <li>3 machines</li>
              </ul>
              <a
                href="/pricing"
                className="block w-full bg-[var(--copper)] hover:bg-[var(--copper-dark)] px-4 py-2 rounded-lg text-sm font-medium transition-colors text-center"
              >
                Get Standard
              </a>
            </div>

            <div className="glass-card rounded-xl p-6 text-center">
              <h3 className="text-[var(--stone-400)] text-sm uppercase tracking-wide mb-2">Enterprise</h3>
              <div className="text-3xl font-bold mb-2">Custom</div>
              <p className="text-[var(--stone-500)] text-sm mb-4">For teams & orgs</p>
              <ul className="text-left text-sm text-[var(--stone-400)] space-y-2 mb-6">
                <li>Everything in Standard</li>
                <li>SSO & audit logs</li>
                <li>Priority support</li>
                <li>Unlimited machines</li>
              </ul>
              <a
                href="mailto:hello@provecalc.com"
                className="block w-full bg-[var(--stone-800)] hover:bg-[var(--stone-700)] px-4 py-2 rounded-lg text-sm font-medium transition-colors text-center"
              >
                Contact Us
              </a>
            </div>
          </div>
          <p className="text-center mt-8">
            <a href="/pricing" className="text-[var(--copper)] hover:text-[var(--copper-light)] text-sm transition-colors">
              Compare all plans &rarr;
            </a>
          </p>
        </div>
      </section>

      {/* Download Preview */}
      <section className="py-16 border-t border-[var(--stone-800)]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2
            className="text-2xl font-bold mb-3"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Available on every platform
          </h2>
          <p className="text-[var(--stone-400)] mb-6">
            Windows, macOS, and Linux. Download in seconds.
          </p>
          <div className="flex justify-center gap-8 mb-6 text-[var(--stone-500)]">
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M3 5.548l7.956-1.083.004 7.674-7.948.044L3 5.548zm7.952 7.467l.008 7.68L3.012 19.6l-.004-6.591 7.944.006zM12.29 4.326L21.93 3v9.092l-9.64.074V4.326zm9.646 8.36L21.93 21l-9.64-1.362-.014-6.96 9.66.008z"/></svg>
              Windows
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
              macOS
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.504 0c-.155 0-.311.002-.465.014-.612.049-1.218.175-1.792.405A5.276 5.276 0 008.09 1.98a6.442 6.442 0 00-.855 1.17c-.249.4-.448.83-.594 1.28a8.867 8.867 0 00-.337 1.44c-.1.6-.145 1.21-.133 1.82v8.62c-.012.61.033 1.22.133 1.82.093.6.243 1.18.444 1.74.202.56.46 1.09.77 1.57.311.49.682.92 1.1 1.3a5.24 5.24 0 001.66 1.12c.617.27 1.27.43 1.93.47.156.01.312.02.469.015.156.005.312-.005.468-.015.66-.04 1.313-.2 1.93-.47a5.24 5.24 0 001.66-1.12c.418-.38.789-.81 1.1-1.3.31-.48.568-1.01.77-1.57.201-.56.351-1.14.444-1.74.1-.6.145-1.21.133-1.82V6.11c.012-.61-.033-1.22-.133-1.82a8.867 8.867 0 00-.337-1.44 5.646 5.646 0 00-.594-1.28 6.442 6.442 0 00-.855-1.17A5.276 5.276 0 0015.753.42 6.44 6.44 0 0013.961.014C13.805.002 13.649 0 13.504 0h-1zM12 5.3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm-3.286 4.207h6.572L12 18.493l-3.286-8.986z"/></svg>
              Linux
            </span>
          </div>
          <a
            href="/download"
            className="inline-block bg-[var(--copper)] hover:bg-[var(--copper-dark)] px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Download Free
          </a>
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
    </main>
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

function TechCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-[var(--stone-400)]">{description}</p>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-3xl font-bold gradient-text mb-1">{value}</div>
      <div className="text-sm text-[var(--stone-500)]">{label}</div>
    </div>
  );
}
