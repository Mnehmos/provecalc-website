import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const PAID_CHECKOUT_ENABLED = process.env.PAID_CHECKOUT_ENABLED === "true";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST(req: Request) {
  try {
    if (!PAID_CHECKOUT_ENABLED) {
      return NextResponse.json(
        {
          error:
            "Paid checkout is temporarily closed. ProveCalc is in design-partner beta.",
        },
        { status: 503 },
      );
    }

    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress;

    // Prevent duplicate purchases
    if (user?.publicMetadata?.isPaid) {
      return NextResponse.json(
        { error: "Already purchased", redirect: "/success" },
        { status: 400 }
      );
    }

    // A discounted/test checkout must never be reachable from production.
    const url = new URL(req.url);
    if (url.searchParams.has("test") || url.searchParams.has("amount")) {
      return NextResponse.json(
        { error: "Test and override checkout parameters are disabled." },
        { status: 410 },
      );
    }

    const amount = 20000;
    const priceId = process.env.STRIPE_LICENSE_PRICE_ID;

    if (!priceId) {
      return NextResponse.json(
        { error: "Paid checkout is not configured." },
        { status: 503 },
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://provecalc.com";

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      ...(email && { customer_email: email }),
      client_reference_id: userId,
      metadata: {
        clerkUserId: userId,
        product: "provecalc-desktop-license",
        amountCents: String(amount),
      },
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
