import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "ProveCalc privacy policy. How we handle your data.",
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
        <p className="text-[var(--stone-500)] mb-12">
          Effective Date: February 19, 2026
        </p>

        <div className="space-y-10 text-[var(--stone-300)] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              1. Information We Collect
            </h2>
            <p className="mb-3">
              When you create an account via our authentication provider (Clerk),
              we collect:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-[var(--stone-400)]">
              <li>Email address</li>
              <li>Display name (if provided)</li>
              <li>Authentication provider identity (Google, GitHub, or email)</li>
            </ul>
            <p className="mt-3">
              <strong>Worksheet data:</strong> The web demo stores your worksheets
              in your browser&apos;s local storage. The desktop app stores files locally
              on your machine. We do not have access to your calculation data.
            </p>
            <p className="mt-3">
              <strong>Compute requests:</strong> When you evaluate expressions,
              the mathematical content is sent to our compute API for processing.
              These requests are not stored or logged beyond what is necessary for
              the immediate computation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              2. How We Use Your Information
            </h2>
            <ul className="list-disc pl-6 space-y-1 text-[var(--stone-400)]">
              <li>To authenticate your account and manage your session</li>
              <li>To process license activations and manage your subscription</li>
              <li>To provide customer support when requested</li>
              <li>To improve our services through aggregated, anonymized usage data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              3. Third-Party Services
            </h2>
            <p className="mb-3">We use the following third-party services:</p>
            <ul className="list-disc pl-6 space-y-1 text-[var(--stone-400)]">
              <li>
                <strong>Clerk</strong> &mdash; Authentication and user management
              </li>
              <li>
                <strong>Stripe</strong> &mdash; Payment processing (we never store
                your payment card details)
              </li>
              <li>
                <strong>Vercel</strong> &mdash; Website hosting
              </li>
              <li>
                <strong>Railway</strong> &mdash; Compute API hosting
              </li>
            </ul>
            <p className="mt-3">
              Each of these services has their own privacy policy governing how
              they handle your data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              4. Data Storage & Security
            </h2>
            <p>
              We implement industry-standard security measures to protect your
              information. Authentication tokens are encrypted. API communications
              use HTTPS. The desktop application stores data locally and operates
              fully offline after activation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              5. Your Rights
            </h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-1 text-[var(--stone-400)]">
              <li>Access your personal data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and associated data</li>
              <li>Export your worksheet data at any time (open JSON format)</li>
              <li>Opt out of non-essential communications</li>
            </ul>
            <p className="mt-3">
              To exercise these rights, contact us at{" "}
              <a
                href="mailto:hello@provecalc.com"
                className="text-[var(--copper)] hover:text-[var(--copper-light)]"
              >
                hello@provecalc.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              6. Children&apos;s Privacy
            </h2>
            <p>
              ProveCalc is not directed at children under the age of 13. We do not
              knowingly collect personal information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              7. Changes to This Policy
            </h2>
            <p>
              We may update this privacy policy from time to time. We will notify
              you of significant changes by posting a notice on our website or
              sending an email to the address associated with your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              8. Contact
            </h2>
            <p>
              For questions about this privacy policy, contact us at{" "}
              <a
                href="mailto:hello@provecalc.com"
                className="text-[var(--copper)] hover:text-[var(--copper-light)]"
              >
                hello@provecalc.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
