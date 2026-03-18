"use client";

import { useState } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

type Status = "idle" | "sending" | "success" | "error";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong.");
      }

      setStatus("success");
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Failed to send. Please try again.");
    }
  }

  const inputClass =
    "w-full bg-[var(--stone-900)] border border-[var(--stone-700)] rounded-lg px-4 py-3 text-sm text-[var(--stone-100)] placeholder:text-[var(--stone-600)] focus:outline-none focus:border-[var(--copper)] transition-colors";

  return (
    <div className="min-h-screen bg-[var(--stone-950)] text-[var(--stone-100)] flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-start justify-center px-6 py-24">
        <div className="w-full max-w-lg">
          <div className="mb-10">
            <h1
              className="text-3xl font-semibold mb-3"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Get in touch
            </h1>
            <p className="text-[var(--stone-400)] text-sm leading-relaxed">
              Questions about ProveCalc, licensing, or engineering calculations?
              We&apos;ll get back to you within one business day.
            </p>
          </div>

          {status === "success" ? (
            <div className="rounded-xl border border-[var(--stone-700)] bg-[var(--stone-900)] p-8 text-center">
              <div className="text-3xl mb-4">✓</div>
              <h2 className="text-lg font-semibold mb-2">Message sent</h2>
              <p className="text-[var(--stone-400)] text-sm">
                Thanks for reaching out. We&apos;ll be in touch soon.
              </p>
              <button
                onClick={() => setStatus("idle")}
                className="mt-6 text-sm text-[var(--copper)] hover:underline"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-[var(--stone-400)] mb-1.5">
                    Name <span className="text-[var(--copper)]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Levario Ramirez"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--stone-400)] mb-1.5">
                    Email <span className="text-[var(--copper)]">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--stone-400)] mb-1.5">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Licensing question, bug report, …"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--stone-400)] mb-1.5">
                  Message <span className="text-[var(--copper)]">*</span>
                </label>
                <textarea
                  required
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what you need…"
                  className={inputClass}
                  style={{ resize: "vertical" }}
                />
              </div>

              {status === "error" && (
                <p className="text-sm text-red-400">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full bg-[var(--copper)] hover:bg-[var(--copper-light,#c8874a)] disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg text-sm transition-colors"
              >
                {status === "sending" ? "Sending…" : "Send message"}
              </button>

              <p className="text-xs text-[var(--stone-600)] text-center">
                Or email directly:{" "}
                <a
                  href="mailto:contact@themnemosyneresearchinstitute.com"
                  className="text-[var(--stone-500)] hover:text-[var(--copper)] transition-colors"
                >
                  contact@themnemosyneresearchinstitute.com
                </a>
              </p>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
