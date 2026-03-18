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

// Ed25519 PKCS8 DER header for wrapping a raw 32-byte private key (RFC 8410)
const ED25519_PKCS8_HEADER = Buffer.from(
  "302e020100300506032b657004220420",
  "hex"
);

/**
 * Generate a signed Ed25519 license key that the desktop app can verify.
 *
 * Requires env var LICENSE_PRIVATE_KEY = base64 of the raw 32-byte Ed25519
 * private key produced by `python tools/license-keygen.py keygen`.
 *
 * Output: base64(JSON{email, issued, tier, signature}) — matches the
 * LicenseFile struct in src-tauri/src/api/license.rs.
 */
function generateSignedLicense(email: string, tier: string = "standard"): string {
  const privateKeyB64 = process.env.LICENSE_PRIVATE_KEY;
  if (!privateKeyB64) {
    throw new Error("LICENSE_PRIVATE_KEY environment variable is not set");
  }

  const privateKeyBytes = Buffer.from(privateKeyB64, "base64");
  if (privateKeyBytes.length !== 32) {
    throw new Error("LICENSE_PRIVATE_KEY must be exactly 32 bytes (base64-encoded raw Ed25519 key)");
  }

  // Wrap raw key bytes in PKCS8 DER format so Node.js crypto can load it
  const pkcs8Der = Buffer.concat([ED25519_PKCS8_HEADER, privateKeyBytes]);
  const privateKey = crypto.createPrivateKey({ key: pkcs8Der, format: "der", type: "pkcs8" });

  const issued = new Date().toISOString();

  // Payload field order must match Rust's LicensePayload serde_json::to_string output:
  // serde(rename_all = "camelCase") → keys: email, issued, tier
  // LicenseTier serde(rename_all = "snake_case") → values: "standard", etc.
  const payload = { email, issued, tier };
  const payloadJson = JSON.stringify(payload);

  const signature = crypto.sign(null, Buffer.from(payloadJson), privateKey);

  // LicenseFile matches Rust struct (also camelCase): email, issued, tier, signature
  const licenseFile = { email, issued, tier, signature: signature.toString("base64") };

  return Buffer.from(JSON.stringify(licenseFile)).toString("base64");
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

      // Resolve email before generating the signed license (email is embedded in the key)
      const customerEmail =
        session.customer_details?.email ||
        user.emailAddresses?.[0]?.emailAddress;

      if (!customerEmail) {
        console.error(`No email found for user ${clerkUserId} — cannot generate license`);
        return NextResponse.json({ received: true });
      }

      const licenseKey = generateSignedLicense(customerEmail, "standard");

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

      try {
        await sendLicenseEmail(customerEmail, licenseKey);
        console.log(`License email sent to ${customerEmail}`);
      } catch (emailErr) {
        // Don't fail the webhook if email fails - key is still in Clerk metadata
        console.error("Failed to send license email:", emailErr);
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
