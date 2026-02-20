import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "ProveCalc terms of service and licensing agreement.",
};

export default function TermsPage() {
  return (
    <main className="pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-6">
        <h1
          className="text-4xl font-bold mb-2"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Terms of Service
        </h1>
        <p className="text-[var(--stone-500)] mb-12">
          Effective Date: February 19, 2026
        </p>

        <div className="space-y-10 text-[var(--stone-300)] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using ProveCalc (&quot;the Service&quot;), including the
              website at provecalc.com, the web demo, and the desktop application,
              you agree to be bound by these Terms of Service. If you do not agree,
              do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              2. Service Description
            </h2>
            <p>
              ProveCalc is an engineering calculation platform that provides
              symbolic mathematics, unit analysis, verification, and AI-assisted
              worksheet construction. It is available as a desktop application
              for Windows, macOS, and Linux, purchased with a one-time license.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              3. Account Terms
            </h2>
            <ul className="list-disc pl-6 space-y-1 text-[var(--stone-400)]">
              <li>You must provide accurate and complete registration information</li>
              <li>One person per account; sharing accounts is not permitted</li>
              <li>You are responsible for maintaining the security of your account</li>
              <li>You must notify us immediately of any unauthorized access</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              4. Licensing
            </h2>
            <p className="mb-3">
              ProveCalc is sold as a one-time purchase at $200 per license key.
              Each key activates on up to 3 machines. Features include:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-[var(--stone-400)]">
              <li>Unlimited worksheets and nodes</li>
              <li>Full SymPy compute engine with Pint unit analysis</li>
              <li>AI assistant (bring your own API key)</li>
              <li>PDF, DOCX, and HTML export</li>
              <li>100% offline after activation</li>
              <li>1 year of updates included</li>
            </ul>
            <p className="mt-3">
              Licenses are perpetual (non-subscription). You may continue using
              the version you have indefinitely. Continued updates after the
              first year require a renewal purchase.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              5. Intellectual Property
            </h2>
            <p className="mb-3">
              <strong>Your content:</strong> You retain all rights to the worksheets,
              calculations, and data you create using ProveCalc. Your files are
              stored locally and belong to you.
            </p>
            <p>
              <strong>Our software:</strong> The ProveCalc application, its source
              code, design, and documentation are the intellectual property of
              ProveCalc and are protected by copyright and other intellectual
              property laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              6. Limitation of Liability
            </h2>
            <div className="bg-[var(--stone-800)]/50 border border-[var(--stone-700)] rounded-lg p-4 text-[var(--stone-300)]">
              <p className="font-semibold text-white mb-2">
                Important Notice for Engineering Professionals
              </p>
              <p>
                ProveCalc is a calculation tool, not a replacement for professional
                engineering judgment. All results produced by ProveCalc must be
                independently verified by a qualified professional engineer before
                being used in any design, construction, or safety-critical application.
              </p>
              <p className="mt-3">
                ProveCalc and its creators are NOT liable for errors in calculations,
                unit conversions, or any decisions made based on outputs from the
                software. The user bears sole responsibility for verifying the
                accuracy and appropriateness of all results.
              </p>
            </div>
            <p className="mt-3">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, PROVECALC SHALL NOT BE LIABLE
              FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
              DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              7. Refund Policy
            </h2>
            <p>
              Desktop licenses come with a 30-day money-back guarantee. If you
              are not satisfied with ProveCalc, contact us within 30 days of
              purchase for a full refund. After 30 days, all sales are final.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              8. Termination
            </h2>
            <p>
              We may suspend or terminate your access to the Service at any time
              for violation of these terms, including abuse of the compute API,
              redistribution of the software, or fraudulent activity. Upon
              termination, your right to use the Service ceases immediately, but
              your locally stored worksheet data remains yours.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              9. Governing Law
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with
              the laws of the State of Arizona, United States, without regard to
              its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              10. Contact
            </h2>
            <p>
              For questions about these terms, contact us at{" "}
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
