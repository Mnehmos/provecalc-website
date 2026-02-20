import { clerkClient } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import crypto from "crypto";
import { Resend } from "resend";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

function getResend() {
  return new Resend(process.env.RESEND_API_KEY!);
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

async function sendLicenseEmail(email: string, licenseKey: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://provecalc.com";
  const resend = getResend();

  await resend.emails.send({
    from: "ProveCalc <noreply@provecalc.com>",
    to: email,
    subject: "Your ProveCalc License Key",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1a1a2e; font-size: 24px; margin: 0;">Thank you for purchasing ProveCalc!</h1>
        </div>

        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Your license key is ready. Copy it into the app on first launch to activate.
        </p>

        <div style="background: #f3f4f6; border: 2px dashed #d1d5db; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
          <p style="font-family: 'Courier New', monospace; font-size: 20px; font-weight: bold; color: #1a1a2e; letter-spacing: 2px; margin: 0;">
            ${licenseKey}
          </p>
        </div>

        <p style="color: #374151; font-size: 14px; line-height: 1.6;">
          You can also find your license key anytime at
          <a href="${appUrl}/success" style="color: #b87333;">provecalc.com/success</a>
          while signed in.
        </p>

        <div style="margin-top: 32px; text-align: center;">
          <a href="${appUrl}/download" style="display: inline-block; background: #b87333; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Download ProveCalc
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />

        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          This license activates on up to 3 machines and works offline after activation.<br/>
          Questions? Reply to this email or visit <a href="${appUrl}" style="color: #b87333;">provecalc.com</a>
        </p>
      </div>
    `,
  });
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

      // Send license key email
      const customerEmail =
        session.customer_details?.email ||
        user.emailAddresses?.[0]?.emailAddress;

      if (customerEmail) {
        try {
          await sendLicenseEmail(customerEmail, licenseKey);
          console.log(`License email sent to ${customerEmail}`);
        } catch (emailErr) {
          // Don't fail the webhook if email fails - key is still in Clerk metadata
          console.error("Failed to send license email:", emailErr);
        }
      }

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
