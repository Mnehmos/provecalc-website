import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/** Return a purchased user's key without exposing it through public metadata. */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  if (!user || user.id !== userId || user.publicMetadata?.isPaid !== true) {
    return NextResponse.json({ error: "License not found" }, { status: 404 });
  }

  // Older fulfilled accounts stored the key in public metadata. Keep those
  // accounts usable while new webhook deliveries write only private metadata.
  const privateKey = user.privateMetadata?.licenseKey;
  const legacyPublicKey = user.publicMetadata?.licenseKey;
  const licenseKey =
    typeof privateKey === "string" && privateKey.length > 0
      ? privateKey
      : typeof legacyPublicKey === "string" && legacyPublicKey.length > 0
        ? legacyPublicKey
        : undefined;

  if (!licenseKey) {
    return NextResponse.json({ error: "License not found" }, { status: 404 });
  }

  return NextResponse.json(
    { licenseKey },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
