"use client";

import Link from "next/link";

export default function AppPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-24">
      <section className="max-w-2xl text-center glass-card rounded-2xl p-10">
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--copper-light)] mb-4">
          Containment preview
        </p>
        <h1
          className="text-4xl font-bold mb-5"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          The browser workspace is not enabled yet
        </h1>
        <p className="text-[var(--stone-400)] text-lg leading-relaxed mb-8">
          Hosted calculation is intentionally disabled while the durable
          compute proxy and entitlement ledger are completed. Explore the
          product preview or request design-partner access; desktop
          verification remains the supported calculation path.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/#demo"
            className="bg-[var(--copper)] hover:bg-[var(--copper-dark)] px-6 py-3 rounded-lg font-medium transition-colors"
          >
            View Product Preview
          </Link>
          <a
            href="/contact"
            className="border border-[var(--stone-700)] hover:border-[var(--stone-500)] px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Request Access
          </a>
        </div>
      </section>
    </main>
  );
}
