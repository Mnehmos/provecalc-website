"use client";

import { useState, useEffect } from "react";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";

export default function NavAuth() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <>
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
    </>
  );
}
