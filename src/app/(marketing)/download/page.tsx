"use client";

import type { Metadata } from "next";
import { useEffect, useState } from "react";

const RELEASES_URL =
  "https://github.com/Mnehmos/worksheet-dist/releases/latest";

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
            Download ProveCalc
          </h1>
          <p className="text-xl text-[var(--stone-400)] mb-2">
            Full-power desktop app. Works offline. Your calculations, your machine.
          </p>
          <p className="text-sm text-[var(--stone-500)]">
            Free to download. Activate with a license key to unlock all features.
          </p>
        </div>

        {/* Platform Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {platforms.map((platform) => {
            const isDetected = detected === platform.id;
            return (
              <div
                key={platform.id}
                className={`rounded-xl p-6 text-center transition-all ${
                  isDetected
                    ? "bg-gradient-to-br from-[var(--copper)]/20 to-[var(--copper-light)]/10 border border-[var(--copper)]/30"
                    : "glass-card"
                }`}
              >
                {isDetected && (
                  <div className="text-xs text-[var(--copper)] font-medium mb-2">
                    Detected your platform
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
                <div className="space-y-1 mb-4">
                  {platform.formats.map((format) => (
                    <p
                      key={format}
                      className="text-sm text-[var(--stone-400)]"
                    >
                      {format}
                    </p>
                  ))}
                </div>
                <p className="text-xs text-[var(--stone-500)] mb-4">
                  {platform.requirement}
                </p>
                <a
                  href={RELEASES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isDetected
                      ? "bg-[var(--copper)] hover:bg-[var(--copper-dark)]"
                      : "bg-[var(--stone-800)] hover:bg-[var(--stone-700)]"
                  }`}
                >
                  Download for {platform.name}
                </a>
              </div>
            );
          })}
        </div>

        {/* What's Included */}
        <div className="glass-card rounded-xl p-8 mb-16">
          <h2
            className="text-2xl font-bold mb-6 text-center"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            What&apos;s included
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Free (no license)</h3>
              <ul className="space-y-1 text-sm text-[var(--stone-400)]">
                <li className="flex items-center gap-2">
                  <span className="text-[var(--copper)]">&#10003;</span>
                  Full compute engine (SymPy + Pint)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[var(--copper)]">&#10003;</span>
                  Up to 20 nodes per worksheet
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[var(--copper)]">&#10003;</span>
                  Save & open worksheets
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[var(--copper)]">&#10003;</span>
                  Plotting & visualization
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">
                With License{" "}
                <span className="text-[var(--copper)] text-sm">($200+)</span>
              </h3>
              <ul className="space-y-1 text-sm text-[var(--stone-400)]">
                <li className="flex items-center gap-2">
                  <span className="text-[var(--copper)]">&#10003;</span>
                  Unlimited nodes & worksheets
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[var(--copper)]">&#10003;</span>
                  AI assistant (bring your own key)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[var(--copper)]">&#10003;</span>
                  PDF & DOCX export
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[var(--copper)]">&#10003;</span>
                  Solve goals & templates
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Installation */}
        <div className="max-w-2xl mx-auto text-center">
          <h2
            className="text-2xl font-bold mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Quick start
          </h2>
          <div className="space-y-4 text-left">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[var(--copper)]/20 text-[var(--copper)] flex items-center justify-center shrink-0 font-bold text-sm">
                1
              </div>
              <div>
                <p className="font-medium">Download & install</p>
                <p className="text-sm text-[var(--stone-400)]">
                  Pick your platform above and run the installer.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[var(--copper)]/20 text-[var(--copper)] flex items-center justify-center shrink-0 font-bold text-sm">
                2
              </div>
              <div>
                <p className="font-medium">Start calculating</p>
                <p className="text-sm text-[var(--stone-400)]">
                  The free tier works immediately. No account required.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[var(--copper)]/20 text-[var(--copper)] flex items-center justify-center shrink-0 font-bold text-sm">
                3
              </div>
              <div>
                <p className="font-medium">Activate (optional)</p>
                <p className="text-sm text-[var(--stone-400)]">
                  Purchase a license key from the{" "}
                  <a
                    href="/pricing"
                    className="text-[var(--copper)] hover:text-[var(--copper-light)]"
                  >
                    pricing page
                  </a>{" "}
                  to unlock all features.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
