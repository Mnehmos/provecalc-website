import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "ProveCalc privacy policy. How we handle your data across the web app and desktop app.",
};

export default function PrivacyPage() {
  return (
    <main className="pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-6">
        <h1
          className="text-4xl font-bold mb-2"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Privacy Policy
        </h1>
        <p className="text-[var(--stone-500)] mb-4">
          Effective Date: March 18, 2026
        </p>
        <p className="text-[var(--stone-400)] mb-12 leading-relaxed">
          ProveCalc is available as a <strong className="text-white">web application</strong> (provecalc.com) and as a{" "}
          <strong className="text-white">desktop application</strong> (Windows, macOS, Linux). These two products
          have meaningfully different data profiles. This policy describes each separately so you know exactly
          what leaves your machine and what stays on it.
        </p>

        {/* Platform badges */}
        <div className="flex gap-3 mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--copper)]/15 text-[var(--copper)] border border-[var(--copper)]/30">
            🌐 Web App
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            🖥 Desktop App
          </span>
        </div>

        <div className="space-y-12 text-[var(--stone-300)] leading-relaxed">

          {/* ── Section 1 ── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">
              1. What Data Each Product Handles
            </h2>

            {/* Web App */}
            <div className="mb-6 rounded-xl border border-[var(--copper)]/20 bg-[var(--copper)]/5 p-5">
              <h3 className="text-base font-semibold text-[var(--copper)] mb-3">
                🌐 Web Application
              </h3>
              <p className="mb-3">
                When you use the web app, we collect the minimum necessary to operate a hosted service:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[var(--stone-400)]">
                <li>
                  <strong className="text-white">Account data</strong> — email address, display name (if provided),
                  and authentication provider identity (Google, GitHub, or email), collected via Clerk.
                </li>
                <li>
                  <strong className="text-white">Worksheet data</strong> — stored in your browser&apos;s local storage.
                  We do not sync or store worksheets on our servers.
                </li>
                <li>
                  <strong className="text-white">Compute requests</strong> — when you evaluate an expression, the
                  mathematical content is sent to our compute API (hosted on Railway) for processing by the
                  SymPy + Pint engine. These requests are processed in memory and are <em>not</em> stored,
                  logged, or used for any purpose beyond returning the result to you.
                </li>
                <li>
                  <strong className="text-white">Payment data</strong> — handled entirely by Stripe. We never
                  receive or store your card number or banking details.
                </li>
              </ul>
            </div>

            {/* Desktop App */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <h3 className="text-base font-semibold text-emerald-400 mb-3">
                🖥 Desktop Application
              </h3>
              <p className="mb-3">
                The desktop app is a local-first application. The vast majority of what it does never
                leaves your machine:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[var(--stone-400)]">
                <li>
                  <strong className="text-white">All computation is local</strong> — the SymPy + Pint compute
                  engine runs as a local Python sidecar process on your machine. No mathematical content is
                  sent to any server for evaluation.
                </li>
                <li>
                  <strong className="text-white">Worksheet files are local</strong> — saved as JSON files to
                  wherever you choose on your filesystem. We have no access to them.
                </li>
                <li>
                  <strong className="text-white">No account required</strong> — the desktop app does not require
                  authentication and collects no personal information during normal use.
                </li>
              </ul>
              <p className="mt-4 mb-2 text-[var(--stone-300)]">
                <strong className="text-white">The only outbound network calls the desktop app makes</strong> are
                inference requests to external LLM providers when you use AI-assisted features with a
                non-local model. Specifically:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[var(--stone-400)]">
                <li>
                  If you configure the app to use an external provider (such as OpenAI, Anthropic, or Google),
                  your prompts and relevant worksheet context are sent directly to that provider&apos;s API using
                  your own API key. We do not proxy, intercept, or log these requests.
                </li>
                <li>
                  If you use a locally-hosted model (e.g., Ollama), no data leaves your machine at all.
                </li>
                <li>
                  The content of these inference calls is governed by the privacy policy of whichever
                  provider you configure. We recommend reviewing their policies before use.
                </li>
              </ul>
              <p className="mt-4 text-[var(--stone-400)]">
                No telemetry, crash reporting, or usage analytics are collected from the desktop app.
              </p>
            </div>
          </section>

          {/* ── Section 2 ── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              2. How We Use Your Information
            </h2>
            <p className="mb-3">For the web app, information collected is used only to:</p>
            <ul className="list-disc pl-6 space-y-1 text-[var(--stone-400)]">
              <li>Authenticate your account and manage your session</li>
              <li>Process license activations via Stripe</li>
              <li>Provide customer support when you contact us</li>
              <li>Improve our services through aggregated, anonymized usage patterns (no individual tracking)</li>
            </ul>
            <p className="mt-3">
              We do not sell your data. We do not use your data for advertising. We do not share it with
              third parties beyond the service providers listed in Section 3.
            </p>
          </section>

          {/* ── Section 3 ── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              3. Third-Party Services
            </h2>

            <p className="mb-3">
              The <strong className="text-white">web app</strong> uses the following services:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[var(--stone-400)] mb-5">
              <li>
                <strong className="text-white">Clerk</strong> — Authentication and user management.{" "}
                <a href="https://clerk.com/privacy" target="_blank" rel="noopener noreferrer"
                  className="text-[var(--copper)] hover:text-[var(--copper-light)]">
                  Clerk Privacy Policy ↗
                </a>
              </li>
              <li>
                <strong className="text-white">Stripe</strong> — Payment processing. We never store payment
                card details.{" "}
                <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer"
                  className="text-[var(--copper)] hover:text-[var(--copper-light)]">
                  Stripe Privacy Policy ↗
                </a>
              </li>
              <li>
                <strong className="text-white">Vercel</strong> — Website and frontend hosting.
              </li>
              <li>
                <strong className="text-white">Railway</strong> — Compute API hosting (SymPy + Pint sidecar
                for the web app only).
              </li>
            </ul>

            <p className="mb-3">
              The <strong className="text-white">desktop app</strong> has no required third-party service
              dependencies. If you configure it to use an external LLM provider, you interact with that
              provider directly using your own API key. Applicable third-party privacy policies in that case:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-[var(--stone-400)]">
              <li>
                <strong className="text-white">OpenAI</strong> — if you use GPT models.{" "}
                <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer"
                  className="text-[var(--copper)] hover:text-[var(--copper-light)]">
                  OpenAI Privacy Policy ↗
                </a>
              </li>
              <li>
                <strong className="text-white">Anthropic</strong> — if you use Claude models.{" "}
                <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer"
                  className="text-[var(--copper)] hover:text-[var(--copper-light)]">
                  Anthropic Privacy Policy ↗
                </a>
              </li>
              <li>
                <strong className="text-white">Google</strong> — if you use Gemini models.{" "}
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer"
                  className="text-[var(--copper)] hover:text-[var(--copper-light)]">
                  Google Privacy Policy ↗
                </a>
              </li>
            </ul>
          </section>

          {/* ── Section 4 ── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              4. Data Storage &amp; Security
            </h2>
            <p className="mb-3">
              <strong className="text-white">Web app:</strong> Authentication tokens are encrypted.
              All API communications use HTTPS. Compute requests are processed in memory only and are
              not persisted. Stripe handles all payment data under PCI-DSS compliance.
            </p>
            <p>
              <strong className="text-white">Desktop app:</strong> Your data never reaches our servers.
              Worksheet files are stored wherever you save them on your local filesystem. The compute
              engine runs entirely in a local Python process. If you use an external LLM provider,
              your API key is stored locally in the app&apos;s configuration directory and is never
              transmitted to us.
            </p>
          </section>

          {/* ── Section 5 ── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              5. Your Rights
            </h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-1 text-[var(--stone-400)]">
              <li>Access your personal data (web app accounts)</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and associated data</li>
              <li>Export your worksheet data at any time (open JSON format, both platforms)</li>
              <li>Opt out of non-essential communications</li>
            </ul>
            <p className="mt-3">
              Desktop app users retain full ownership of all their data at all times — there is no
              account to delete and no data held by us.
            </p>
            <p className="mt-3">
              To exercise your rights for a web app account, contact us at{" "}
              <a
                href="mailto:contact@themnemosyneresearchinstitute.com"
                className="text-[var(--copper)] hover:text-[var(--copper-light)]"
              >
                contact@themnemosyneresearchinstitute.com
              </a>
              .
            </p>
          </section>

          {/* ── Section 6 ── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              6. Children&apos;s Privacy
            </h2>
            <p>
              ProveCalc is not directed at children under the age of 13. We do not knowingly collect
              personal information from children under 13. If you believe a child has provided us with
              personal information, please contact us and we will delete it promptly.
            </p>
          </section>

          {/* ── Section 7 ── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              7. Changes to This Policy
            </h2>
            <p>
              We may update this privacy policy from time to time. We will notify web app users of
              significant changes by posting a notice on our website or sending an email to the address
              associated with your account. The effective date at the top of this page reflects the
              date of the most recent revision.
            </p>
          </section>

          {/* ── Section 8 ── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              8. Contact
            </h2>
            <p>
              For questions about this privacy policy, contact us at{" "}
              <a
                href="mailto:contact@themnemosyneresearchinstitute.com"
                className="text-[var(--copper)] hover:text-[var(--copper-light)]"
              >
                contact@themnemosyneresearchinstitute.com
              </a>
              .
            </p>
            <p className="mt-3 text-[var(--stone-500)] text-sm">
              The Mnemosyne Research Institute &mdash; Safford, Arizona
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}
