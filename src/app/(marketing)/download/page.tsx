"use client";

import { useEffect, useState } from "react";
import { useUser, SignUpButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { CheckoutButton } from "../../../components/landing/CheckoutButton";

type Platform = "windows" | "macos" | "linux" | null;

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("win")) return "windows";
  if (ua.includes("mac")) return "macos";
  if (ua.includes("linux")) return "linux";
  return null;
}

const platforms = [
  {
    id: "windows" as const,
    name: "Windows",
    icon: (
      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
        <path d="M3 5.548l7.956-1.083.004 7.674-7.948.044L3 5.548zm7.952 7.467l.008 7.68L3.012 19.6l-.004-6.591 7.944.006zM12.29 4.326L21.93 3v9.092l-9.64.074V4.326zm9.646 8.36L21.93 21l-9.64-1.362-.014-6.96 9.66.008z" />
      </svg>
    ),
    formats: ["NSIS Installer (.exe)", "MSI Installer (.msi)"],
    requirement: "Windows 10 or later (64-bit)",
  },
  {
    id: "macos" as const,
    name: "macOS",
    icon: (
      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    ),
    formats: ["Apple Silicon (.dmg)", "Intel (.dmg)"],
    requirement: "macOS 11 Big Sur or later",
  },
  {
    id: "linux" as const,
    name: "Linux",
    icon: (
      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12.504 0c-.155 0-.311.002-.465.014-.612.049-1.218.175-1.792.405A5.276 5.276 0 008.09 1.98a6.442 6.442 0 00-.855 1.17c-.249.4-.448.83-.594 1.28a8.867 8.867 0 00-.337 1.44c-.1.6-.145 1.21-.133 1.82v8.62c-.012.61.033 1.22.133 1.82.093.6.243 1.18.444 1.74.202.56.46 1.09.77 1.57.311.49.682.92 1.1 1.3a5.24 5.24 0 001.66 1.12c.617.27 1.27.43 1.93.47.156.01.312.02.469.015.156.005.312-.005.468-.015.66-.04 1.313-.2 1.93-.47a5.24 5.24 0 001.66-1.12c.418-.38.789-.81 1.1-1.3.31-.48.568-1.01.77-1.57.201-.56.351-1.14.444-1.74.1-.6.145-1.21.133-1.82V6.11c.012-.61-.033-1.22-.133-1.82a8.867 8.867 0 00-.337-1.44 5.646 5.646 0 00-.594-1.28 6.442 6.442 0 00-.855-1.17A5.276 5.276 0 0015.753.42 6.44 6.44 0 0013.961.014C13.805.002 13.649 0 13.504 0h-1zM12 5.3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm-3.286 4.207h6.572L12 18.493l-3.286-8.986z" />
      </svg>
    ),
    formats: ["Debian/Ubuntu (.deb)", "AppImage (universal)"],
    requirement: "Ubuntu 20.04+ or equivalent",
  },
];

export default function DownloadPage() {
  const [detected, setDetected] = useState<Platform>(null);
  const { user } = useUser();
  const isPaid = user?.publicMetadata?.isPaid as boolean | undefined;
  const licenseKey = user?.publicMetadata?.licenseKey as string | undefined;

  useEffect(() => {
    setDetected(detectPlatform());
  }, []);

  return (
    <main className="pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <h1
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Get ProveCalc
          </h1>
          <p className="text-xl text-[var(--stone-400)] mb-2">
            Full-power desktop app. Works offline. Your calculations, your machine.
          </p>
          <p className="text-sm text-[var(--stone-500)]">
            {isPaid
              ? "Your license is active. Download below."
              : "Purchase a license to download the desktop application."}
          </p>
        </div>

        {/* Purchase CTA or License Info */}
        {isPaid ? (
          <div className="bg-gradient-to-br from-[var(--copper)]/20 to-[var(--copper-light)]/10 border border-[var(--copper)]/30 rounded-xl p-8 text-center mb-16">
            <p className="text-sm text-[var(--stone-400)] mb-2">Your License Key</p>
            <div className="bg-[var(--stone-900)] rounded-lg p-4 mb-3 font-mono text-lg text-[var(--copper-light)] tracking-wider select-all">
              {licenseKey}
            </div>
            <p className="text-xs text-[var(--stone-500)]">
              Activates on up to 3 machines. Enter this key in the desktop app after installing.
            </p>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-[var(--copper)]/20 to-[var(--copper-light)]/10 border border-[var(--copper)]/30 rounded-xl p-8 text-center mb-16">
            <h2
              className="text-2xl font-bold mb-2"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <span className="gradient-text">$200</span>{" "}
              <span className="text-[var(--stone-400)] text-lg font-normal">one-time</span>
            </h2>
            <p className="text-[var(--stone-400)] mb-6">
              Unlimited worksheets. AI-assisted. 3 machines. Forever yours.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <CheckoutButton
                className="bg-[var(--copper)] hover:bg-[var(--copper-dark)] px-8 py-3 rounded-lg font-medium transition-colors"
              />
              <a
                href="/pricing"
                className="border border-[var(--stone-700)] hover:border-[var(--stone-500)] px-8 py-3 rounded-lg font-medium transition-colors"
              >
                See Pricing
              </a>
            </div>
            <p className="text-xs text-[var(--stone-500)] mt-4">
              30-day money-back guarantee. Download link delivered after purchase.
            </p>
          </div>
        )}

        {/* Platform Support */}
        <div className="mb-16">
          <h2
            className="text-2xl font-bold text-center mb-8"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Available on every platform
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {platforms.map((platform) => {
              const isDetected = detected === platform.id;
              const CardTag = isPaid ? "a" : "div";
              const linkProps = isPaid
                ? {
                    href: "https://github.com/Mnehmos/worksheet-dist/releases/latest",
                    target: "_blank",
                    rel: "noopener noreferrer",
                  }
                : {};
              return (
                <CardTag
                  key={platform.id}
                  {...linkProps}
                  className={`rounded-xl p-6 text-center block ${
                    isDetected
                      ? "bg-gradient-to-br from-[var(--copper)]/10 to-transparent border border-[var(--copper)]/20"
                      : "glass-card"
                  } ${isPaid ? "hover:border-[var(--copper)]/30 transition-colors cursor-pointer" : ""}`}
                >
                  {isDetected && (
                    <div className="text-xs text-[var(--copper)] font-medium mb-2">
                      Your platform
                    </div>
                  )}
                  <div
                    className={`flex justify-center mb-4 ${
                      isDetected
                        ? "text-[var(--copper-light)]"
                        : "text-[var(--stone-400)]"
                    }`}
                  >
                    {platform.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{platform.name}</h3>
                  <div className="space-y-1 mb-3">
                    {platform.formats.map((format) => (
                      <p
                        key={format}
                        className="text-sm text-[var(--stone-400)]"
                      >
                        {format}
                      </p>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--stone-500)]">
                    {platform.requirement}
                  </p>
                  {isPaid && (
                    <p className="text-xs text-[var(--copper)] mt-3 font-medium">
                      Download &rarr;
                    </p>
                  )}
                </CardTag>
              );
            })}
          </div>
        </div>

        {/* What You Get */}
        <div className="glass-card rounded-xl p-8 mb-16">
          <h2
            className="text-2xl font-bold mb-6 text-center"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            What you get
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <ul className="space-y-3 text-sm text-[var(--stone-300)]">
              <li className="flex items-start gap-2">
                <span className="text-[var(--copper)] mt-0.5">&#10003;</span>
                Unlimited worksheets and nodes
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--copper)] mt-0.5">&#10003;</span>
                Full SymPy compute engine with Pint unit analysis
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--copper)] mt-0.5">&#10003;</span>
                AI assistant that structures, never computes (BYOK)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--copper)] mt-0.5">&#10003;</span>
                4-gate verification on every calculation
              </li>
            </ul>
            <ul className="space-y-3 text-sm text-[var(--stone-300)]">
              <li className="flex items-start gap-2">
                <span className="text-[var(--copper)] mt-0.5">&#10003;</span>
                Export to PDF, DOCX, and HTML
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--copper)] mt-0.5">&#10003;</span>
                100% offline after activation
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--copper)] mt-0.5">&#10003;</span>
                Solve goals and system analysis
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--copper)] mt-0.5">&#10003;</span>
                1 year of updates included
              </li>
            </ul>
          </div>
        </div>

        {/* How It Works */}
        <div className="max-w-2xl mx-auto">
          <h2
            className="text-2xl font-bold mb-6 text-center"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            How it works
          </h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[var(--copper)]/20 text-[var(--copper)] flex items-center justify-center shrink-0 font-bold text-sm">
                1
              </div>
              <div>
                <p className="font-medium">Purchase a license</p>
                <p className="text-sm text-[var(--stone-400)]">
                  Choose your plan on the{" "}
                  <a
                    href="/pricing"
                    className="text-[var(--copper)] hover:text-[var(--copper-light)]"
                  >
                    pricing page
                  </a>
                  . Secure checkout via Stripe.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[var(--copper)]/20 text-[var(--copper)] flex items-center justify-center shrink-0 font-bold text-sm">
                2
              </div>
              <div>
                <p className="font-medium">Download the installer</p>
                <p className="text-sm text-[var(--stone-400)]">
                  You&apos;ll receive a download link and license key by email immediately after purchase.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[var(--copper)]/20 text-[var(--copper)] flex items-center justify-center shrink-0 font-bold text-sm">
                3
              </div>
              <div>
                <p className="font-medium">Activate & start calculating</p>
                <p className="text-sm text-[var(--stone-400)]">
                  Enter your license key in the app. Works offline from day one.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Free Demo Callout */}
        <div className="mt-16 text-center">
          <p className="text-[var(--stone-500)] mb-3">
            Not ready to buy? Try the free web demo first.
          </p>
          <SignedOut>
            <SignUpButton mode="modal">
              <button className="border border-[var(--stone-700)] hover:border-[var(--stone-500)] px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
                Try Web Demo
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <a
              href="/app"
              className="inline-block border border-[var(--stone-700)] hover:border-[var(--stone-500)] px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              Open Web Demo
            </a>
          </SignedIn>
        </div>
      </div>
    </main>
  );
}
