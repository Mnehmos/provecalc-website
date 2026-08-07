import { NextResponse } from "next/server";

/** Provider diagnostics are operator-only and are not exposed in production. */
export async function GET() {
  return NextResponse.json(
    { error: "Provider diagnostics are disabled in production." },
    { status: 410 },
  );
}
