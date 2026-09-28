import type Stripe from "stripe";

export const LICENSE_PRICE_CENTS = 20_000;
export const TEST_LICENSE_PRICE_CENTS = 100;

/** True when the configured Stripe key is a test-mode key. */
export function isStripeTestMode(secretKey = process.env.STRIPE_SECRET_KEY): boolean {
  return typeof secretKey === "string" && /^(sk|rk)_test_/.test(secretKey);
}

/**
 * Why a completed checkout must not receive a license, or null when it may.
 *
 * Test checkouts cost $1 and are only valid against a Stripe test-mode key;
 * one that reaches a live-mode webhook must never produce a real license.
 */
export function licenseIssueProblem(
  session: Pick<Stripe.Checkout.Session, "payment_status" | "metadata">,
  testMode: boolean,
): string | null {
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    return `payment status is ${session.payment_status}`;
  }
  if (session.metadata?.isTest === "true" && !testMode) {
    return "test checkout received in live mode";
  }
  return null;
}
