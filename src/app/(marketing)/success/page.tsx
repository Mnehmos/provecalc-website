"use client";

import { useUser, SignUpButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { useState } from "react";

const platforms = [
  {
    name: "Windows",
    formats: ["NSIS Installer (.exe)", "MSI Installer (.msi)"],
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M3 5.548l7.956-1.083.004 7.674-7.948.044L3 5.548zm7.952 7.467l.008 7.68L3.012 19.6l-.004-6.591 7.944.006zM12.29 4.326L21.93 3v9.092l-9.64.074V4.326zm9.646 8.36L21.93 21l-9.64-1.362-.014-6.96 9.66.008z" />
      </svg>
    ),
  },
  {
    name: "macOS",
    formats: ["Apple Silicon (.dmg)", "Intel (.dmg)"],
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    ),
  },
  {
    name: "Linux",
    formats: ["Debian/Ubuntu (.deb)", "AppImage (universal)"],
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12.504 0c-.155 0-.311.002-.465.014-.612.049-1.218.175-1.792.405A5.276 5.276 0 008.09 1.98a6.442 6.442 0 00-.855 1.17c-.249.4-.448.83-.594 1.28a8.867 8.867 0 00-.337 1.44c-.1.6-.145 1.21-.133 1.82v8.62c-.012.61.033 1.22.133 1.82.093.6.243 1.18.444 1.74.202.56.46 1.09.77 1.57.311.49.682.92 1.1 1.3a5.24 5.24 0 001.66 1.12c.617.27 1.27.43 1.93.47.156.01.312.02.469.015.156.005.312-.005.468-.015.66-.04 1.313-.2 1.93-.47a5.24 5.24 0 001.66-1.12c.418-.38.789-.81 1.1-1.3.31-.48.568-1.01.77-1.57.201-.56.351-1.14.444-1.74.1-.6.145-1.21.133-1.82V6.11c.012-.61-.033-1.22-.133-1.82a8.867 8.867 0 00-.337-1.44 5.646 5.646 0 00-.594-1.28 6.442 6.442 0 00-.855-1.17A5.276 5.276 0 0015.753.42 6.44 6.44 0 0013.961.014C13.805.002 13.649 0 13.504 0h-1zM12 5.3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm-3.286 4.207h6.572L12 18.493l-3.286-8.986z" />
      </svg>
    ),
  },
];

export default function SuccessPage() {
  const { user, isLoaded } = useUser();
  const [copied, setCopied] = useState(false);

  if (!isLoaded) {
    return (
      <main className="pt-24 pb-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-[var(--stone-400)]">Loading...</p>
        </div>
      </main>
    );
  }

  const licenseKey = user?.publicMetadata?.licenseKey as string | undefined;
  const isPaid = user?.publicMetadata?.isPaid as boolean | undefined;

  // Not signed in
  if (!user) {
    return (
      <main className="pt-24 pb-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h1
            className="text-4xl font-bold mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Sign in to view your license
          </h1>
          <p className="text-[var(--stone-400)] mb-8">
            Sign in with the account you used to purchase ProveCalc.
          </p>
          <SignedOut>
            <SignUpButton mode="modal">
              <button className="bg-[var(--copper)] hover:bg-[var(--copper-dark)] px-6 py-3 rounded-lg font-medium transition-colors">
                Sign In
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <a
              href="/success"
              className="bg-[var(--copper)] hover:bg-[var(--copper-dark)] px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Reload
            </a>
          </SignedIn>
        </div>
      </main>
    );
  }

  // Signed in but no purchase
  if (!isPaid) {
    return (
      <main className="pt-24 pb-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h1
            className="text-4xl font-bold mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            No license found
          </h1>
          <p className="text-[var(--stone-400)] mb-8">
            It looks like you haven&apos;t purchased ProveCalc yet. If you just
            completed a purchase, it may take a moment to process.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="/pricing"
              className="bg-[var(--copper)] hover:bg-[var(--copper-dark)] px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Buy ProveCalc &mdash; $200
            </a>
            <button
              onClick={() => window.location.reload()}
              className="border border-[var(--stone-700)] hover:border-[var(--stone-500)] px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </main>
    );
  }

  const copyKey = () => {
    if (licenseKey) {
      navigator.clipboard.writeText(licenseKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <main className="pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--copper)]/20 text-[var(--copper)] mb-4">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1
            className="text-4xl font-bold mb-2"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Purchase complete
          </h1>
          <p className="text-[var(--stone-400)]">
            Thank you for buying ProveCalc. Your license key is ready.
          </p>
        </div>

        {/* License Key */}
        <div className="bg-gradient-to-br from-[var(--copper)]/20 to-[var(--copper-light)]/10 border border-[var(--copper)]/30 rounded-xl p-8 text-center mb-12">
          <p className="text-sm text-[var(--stone-400)] mb-3">
            Your License Key
          </p>
          <div className="bg-[var(--stone-900)] rounded-lg p-4 mb-4 font-mono text-lg text-[var(--copper-light)] tracking-wider select-all">
            {licenseKey}
          </div>
          <button
            onClick={copyKey}
            className="text-sm text-[var(--copper)] hover:text-[var(--copper-light)] transition-colors"
          >
            {copied ? "Copied!" : "Copy to clipboard"}
          </button>
          <p className="text-xs text-[var(--stone-500)] mt-3">
            This key is saved to your account. You can always find it here.
          </p>
        </div>

        {/* Download */}
        <div className="mb-12">
          <h2
            className="text-2xl font-bold text-center mb-6"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Download ProveCalc
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {platforms.map((platform) => (
              <a
                key={platform.name}
                href="https://github.com/Mnehmos/worksheet-dist/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
                className="glass-card rounded-xl p-6 text-center hover:border-[var(--copper)]/30 transition-colors"
              >
                <div className="flex justify-center mb-3 text-[var(--stone-400)]">
                  {platform.icon}
                </div>
                <h3 className="font-semibold mb-2">{platform.name}</h3>
                {platform.formats.map((f) => (
                  <p key={f} className="text-xs text-[var(--stone-500)]">
                    {f}
                  </p>
                ))}
              </a>
            ))}
          </div>
          <p className="text-center text-xs text-[var(--stone-500)] mt-4">
            All platforms available on the releases page.
          </p>
        </div>

        {/* Next Steps */}
        <div className="glass-card rounded-xl p-8">
          <h2
            className="text-xl font-bold mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Getting started
          </h2>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-[var(--copper)]/20 text-[var(--copper)] flex items-center justify-center shrink-0 text-sm font-bold">
                1
              </div>
              <div>
                <p className="font-medium">Download the installer</p>
                <p className="text-sm text-[var(--stone-400)]">
                  Choose your platform above and download the latest release.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-[var(--copper)]/20 text-[var(--copper)] flex items-center justify-center shrink-0 text-sm font-bold">
                2
              </div>
              <div>
                <p className="font-medium">Install and launch</p>
                <p className="text-sm text-[var(--stone-400)]">
                  Run the installer. ProveCalc will open automatically.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-[var(--copper)]/20 text-[var(--copper)] flex items-center justify-center shrink-0 text-sm font-bold">
                3
              </div>
              <div>
                <p className="font-medium">Activate with your license key</p>
                <p className="text-sm text-[var(--stone-400)]">
                  Paste your key when prompted. Works on up to 3 machines.
                  100% offline after activation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
