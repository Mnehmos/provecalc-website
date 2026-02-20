import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST(req: Request) {
  try {
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

    // Test mode: ?test=1 charges $1 instead of $200
    const url = new URL(req.url);
    const isTest = url.searchParams.get("test") === "1";
    const amount = isTest ? 100 : 20000; // $1.00 or $200.00
    const productName = isTest ? "ProveCalc License (TEST)" : "ProveCalc License";

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://provecalc.com";

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productName,
              description:
                "Lifetime desktop license. 3 machines. 1 year of updates included.",
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      ...(email && { customer_email: email }),
      client_reference_id: userId,
      metadata: {
        clerkUserId: userId,
        isTest: isTest ? "true" : "false",
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
