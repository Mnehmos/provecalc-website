import { clerkClient } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import crypto from "crypto";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

function generateLicenseKey(): string {
  // Unambiguous characters (no 0/O, 1/I/L)
  const chars = "BCDFGHJKMNPQRTVWXYZ2345678";
  let key = "";
  const bytes = crypto.randomBytes(24);
  for (let i = 0; i < 24; i++) {
    key += chars[bytes[i] % chars.length];
    if ((i + 1) % 4 === 0 && i < 23) key += "-";
  }
  return key;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const clerkUserId = session.metadata?.clerkUserId;

      if (!clerkUserId) {
        console.error("No clerkUserId in session metadata");
        return NextResponse.json({ received: true });
      }

      // Check if user already has a license (idempotency)
      const clerk = await clerkClient();
      const user = await clerk.users.getUser(clerkUserId);
      if (user.publicMetadata?.isPaid) {
        console.log(`User ${clerkUserId} already has a license, skipping`);
        return NextResponse.json({ received: true });
      }

      const licenseKey = generateLicenseKey();

      await clerk.users.updateUserMetadata(clerkUserId, {
        publicMetadata: {
          isPaid: true,
          licenseKey,
          purchaseDate: new Date().toISOString(),
          maxMachines: 3,
        },
        privateMetadata: {
          stripeCustomerId: session.customer as string,
          stripeSessionId: session.id,
          paymentStatus: session.payment_status,
        },
      });

      console.log(`License issued to user ${clerkUserId}: ${licenseKey}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
