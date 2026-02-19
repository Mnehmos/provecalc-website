import type { Metadata } from "next";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import "./globals.css";
import "../styles/index.css";

export const metadata: Metadata = {
  title: "ProveCalc - Engineering Calculations You Can Trust",
  description:
    "Professional engineering calculation software with full audit trails. Show your work, prove your results.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
    >
      <html lang="en">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin="anonymous"
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
            rel="stylesheet"
          />
        </head>
        <body>
          <nav className="fixed top-0 w-full z-50 bg-[var(--stone-950)]/80 backdrop-blur-md border-b border-[var(--stone-800)]">
            <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
              <a href="/" className="flex items-center gap-2">
                <img src="/logo.svg" alt="ProveCalc" className="w-8 h-8" />
                <span className="text-xl font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  ProveCalc
                </span>
              </a>
              <div className="flex items-center gap-4">
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="text-sm text-[var(--stone-400)] hover:text-white transition-colors">
                      Sign In
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="bg-[var(--copper)] hover:bg-[var(--copper-dark)] px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                      Try Free
                    </button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <a
                    href="/app"
                    className="bg-[var(--copper)] hover:bg-[var(--copper-dark)] px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Open App
                  </a>
                  <UserButton afterSignOutUrl="/" />
                </SignedIn>
              </div>
            </div>
          </nav>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
