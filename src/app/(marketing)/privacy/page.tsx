import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "ProveCalc privacy policy. How we handle your data across the web app and desktop app.",
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
          ProveCalc is available as a{" "}
          <strong className="text-white">web application</strong> at
          provecalc.com and as a{" "}
          <strong className="text-white">desktop application</strong> for
          Windows, macOS, and Linux. These products have different data flows,
          so this policy describes them separately.
        </p>

        <div className="flex gap-3 mb-12 flex-wrap">
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--copper)]/15 text-[var(--copper)] border border-[var(--copper)]/30">
            Web app
          </span>
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Desktop app
          </span>
        </div>

        <div className="space-y-12 text-[var(--stone-300)] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">
              1. What data each product handles
            </h2>

            <div className="mb-6 rounded-xl border border-[var(--copper)]/20 bg-[var(--copper)]/5 p-5">
              <h3 className="text-base font-semibold text-[var(--copper)] mb-3">
                Web application
              </h3>
              <p className="mb-3">
                When you use the web app, we collect only what is needed to run
                a hosted service:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[var(--stone-400)]">
                <li>
                  <strong className="text-white">Account data</strong>: email
                  address, display name if provided, and authentication provider
                  identity through Clerk.
                </li>
                <li>
                  <strong className="text-white">Worksheet data</strong>:
                  stored in your browser&apos;s local storage. We do not sync or
                  store web worksheets on ProveCalc servers.
                </li>
                <li>
                  <strong className="text-white">Compute requests</strong>:
                  when you evaluate an expression in the web app, the
                  mathematical content is sent to our hosted compute API for
                  processing by the SymPy + Pint engine. Requests are processed
                  in memory and are not stored for later use.
                </li>
                <li>
                  <strong className="text-white">Payment data</strong>:
                  handled by Stripe. We do not receive or store your card number
                  or bank details.
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <h3 className="text-base font-semibold text-emerald-400 mb-3">
                Desktop application
              </h3>
              <p className="mb-3">
                The desktop app is local-first. The normal calculation workflow
                stays on your machine:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[var(--stone-400)]">
                <li>
                  <strong className="text-white">All computation is local</strong>
                  : the SymPy + Pint compute engine runs as a local Python
                  sidecar process. Calculation content is not sent to our
                  servers for evaluation.
                </li>
                <li>
                  <strong className="text-white">Worksheet files are local</strong>
                  : files are saved wherever you choose on your filesystem.
                </li>
                <li>
                  <strong className="text-white">No account required</strong>:
                  the desktop app does not require sign-in for normal use and
                  does not collect telemetry or analytics.
                </li>
              </ul>
              <p className="mt-4 mb-2 text-[var(--stone-300)]">
                <strong className="text-white">
                  The only outbound network calls the desktop app makes
                </strong>{" "}
                are optional AI requests when you choose a non-local model:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[var(--stone-400)]">
                <li>
                  If you configure an external provider such as OpenAI,
                  Anthropic, or Google, your prompt and relevant worksheet
                  context are sent directly to that provider using your own API
                  key.
                </li>
                <li>
                  If you use a local model such as Ollama, no AI content leaves
                  your machine.
                </li>
                <li>
                  Those AI requests are governed by the privacy policy of the
                  provider you choose.
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              2. How we use your information
            </h2>
            <p className="mb-3">
              For the web app, information collected is used only to:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-[var(--stone-400)]">
              <li>Authenticate your account and manage your session</li>
              <li>Process purchases and manage license records via Stripe</li>
              <li>Provide customer support when you contact us</li>
              <li>
                Improve our services through aggregated, anonymized usage
                patterns with no individual tracking
              </li>
            </ul>
            <p className="mt-3">
              We do not sell your data, use your data for advertising, or share
              it beyond the service providers listed below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              3. Third-party services
            </h2>

            <p className="mb-3">
              The <strong className="text-white">web app</strong> uses:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[var(--stone-400)] mb-5">
              <li>
                <strong className="text-white">Clerk</strong>: authentication
                and user management.{" "}
                <a
                  href="https://clerk.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--copper)] hover:text-[var(--copper-light)]"
                >
                  Clerk Privacy Policy
                </a>
              </li>
              <li>
                <strong className="text-white">Stripe</strong>: payment
                processing.{" "}
                <a
                  href="https://stripe.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--copper)] hover:text-[var(--copper-light)]"
                >
                  Stripe Privacy Policy
                </a>
              </li>
              <li>
                <strong className="text-white">Vercel</strong>: website and
                frontend hosting.
              </li>
              <li>
                <strong className="text-white">Railway</strong>: hosted compute
                API for the web app only.
              </li>
            </ul>

            <p className="mb-3">
              The <strong className="text-white">desktop app</strong> has no
              required third-party service dependency. If you configure an
              external AI provider, you interact with that provider directly
              using your own API key. Relevant privacy policies include:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-[var(--stone-400)]">
              <li>
                <strong className="text-white">OpenAI</strong>:{" "}
                <a
                  href="https://openai.com/policies/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--copper)] hover:text-[var(--copper-light)]"
                >
                  OpenAI Privacy Policy
                </a>
              </li>
              <li>
                <strong className="text-white">Anthropic</strong>:{" "}
                <a
                  href="https://www.anthropic.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--copper)] hover:text-[var(--copper-light)]"
                >
                  Anthropic Privacy Policy
                </a>
              </li>
              <li>
                <strong className="text-white">Google</strong>:{" "}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--copper)] hover:text-[var(--copper-light)]"
                >
                  Google Privacy Policy
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              4. Data storage and security
            </h2>
            <p className="mb-3">
              <strong className="text-white">Web app:</strong> authentication
              tokens are encrypted, all API communications use HTTPS, and web
              compute requests are processed in memory rather than persisted as a
              worksheet database.
            </p>
            <p>
              <strong className="text-white">Desktop app:</strong> worksheet
              files are stored wherever you save them locally, and the compute
              engine runs on your machine. If you use an external AI provider,
              your API key is stored locally in the app configuration and is not
              transmitted to ProveCalc.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              5. Your rights
            </h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-1 text-[var(--stone-400)]">
              <li>Access your personal data for web app accounts</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and associated data</li>
              <li>Export your worksheet data at any time in open formats</li>
              <li>Opt out of non-essential communications</li>
            </ul>
            <p className="mt-3">
              Desktop app users retain ownership of their worksheets at all
              times. There is no desktop worksheet database on our servers.
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

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              6. Children&apos;s privacy
            </h2>
            <p>
              ProveCalc is not directed at children under 13, and we do not
              knowingly collect personal information from children under 13. If
              you believe a child has provided personal information, contact us
              and we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              7. Changes to this policy
            </h2>
            <p>
              We may update this privacy policy from time to time. Significant
              changes will be posted on the site or sent by email to the address
              associated with your account when appropriate.
            </p>
          </section>

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
              The Mnemosyne Research Institute, Safford, Arizona
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
