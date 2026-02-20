"use client";

import { useAuth, useUser, SignUpButton } from "@clerk/nextjs";
import { useState } from "react";

export function CheckoutButton({
  className = "",
  label = "Buy Now",
}: {
  className?: string;
  label?: string;
}) {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);

  // Already purchased — link to success page
  if (user?.publicMetadata?.isPaid) {
    return (
      <a href="/success" className={className}>
        View License
      </a>
    );
  }

  // Not signed in — sign up first
  if (!isSignedIn) {
    return (
      <SignUpButton mode="modal">
        <button className={className}>{label}</button>
      </SignUpButton>
    );
  }

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();

      if (data.redirect) {
        window.location.href = data.redirect;
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No checkout URL returned:", data);
        setLoading(false);
      }
    } catch (err) {
      console.error("Checkout failed:", err);
      setLoading(false);
    }
  };

  return (
    <button onClick={handleCheckout} disabled={loading} className={className}>
      {loading ? "Redirecting..." : label}
    </button>
  );
}
