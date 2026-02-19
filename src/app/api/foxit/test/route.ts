/**
 * GET /api/foxit/test
 *
 * Diagnostic endpoint: tries the Document Generation API against
 * multiple possible Foxit host URLs to find the correct one.
 */

import { NextResponse } from "next/server";

const CLIENT_ID = process.env.FOXIT_CLIENT_ID || "";
const CLIENT_SECRET = process.env.FOXIT_CLIENT_SECRET || "";

// Possible hosts for Foxit Document Generation API
const CANDIDATE_HOSTS = [
  "https://na1.fusion.foxit.com",
  "https://na1.foxitcloud.com",
  "https://developer-api.foxit.com",
  "https://api.developer-api.foxit.com",
  "https://app.developer-api.foxit.com",
];

// Minimal test: a tiny DOCX base64 isn't needed — we just want to see
// if the auth succeeds or fails with a specific error vs "Invalid credentials"
const DOCGEN_PATH = "/document-generation/api/GenerateDocumentBase64";

async function testHost(host: string): Promise<{
  host: string;
  status: number;
  body: string;
  ok: boolean;
}> {
  const url = `${host}${DOCGEN_PATH}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        outputFormat: "pdf",
        documentValues: { test: "hello" },
        base64FileString: "UEsDBBQ=", // minimal invalid docx, just testing auth
      }),
    });

    const text = await res.text();
    return {
      host,
      status: res.status,
      body: text.substring(0, 500),
      ok: res.ok,
    };
  } catch (err) {
    return {
      host,
      status: 0,
      body: err instanceof Error ? err.message : String(err),
      ok: false,
    };
  }
}

export async function GET() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return NextResponse.json({
      error: "FOXIT_CLIENT_ID or FOXIT_CLIENT_SECRET not set",
    });
  }

  // Test all hosts in parallel
  const results = await Promise.all(CANDIDATE_HOSTS.map(testHost));

  // Find any that didn't return 401
  const nonAuth = results.filter((r) => r.status !== 401 && r.status !== 0);

  return NextResponse.json({
    clientIdPrefix: CLIENT_ID.substring(0, 10) + "...",
    secretSet: CLIENT_SECRET.length > 0,
    results,
    recommendation:
      nonAuth.length > 0
        ? `Try: ${nonAuth[0].host}`
        : "All hosts returned 401 or failed. Credentials may be invalid.",
  });
}
