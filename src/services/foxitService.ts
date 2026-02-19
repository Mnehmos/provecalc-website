/**
 * Foxit Document Generation API Client
 *
 * Uses the Document Generation API to convert DOCX templates + JSON data → PDF.
 * Auth: client_id and client_secret as HTTP headers (per official examples).
 */

const FOXIT_HOST = (
  process.env.FOXIT_BASE_URL || "https://na1.fusion.foxit.com"
).replace(/\/+$/, "");

const FOXIT_CLIENT_ID = process.env.FOXIT_CLIENT_ID || "";
const FOXIT_CLIENT_SECRET = process.env.FOXIT_CLIENT_SECRET || "";

// ---------- Document Generation API ----------

export interface DocGenResponse {
  base64FileString: string;
  error?: string;
}

/**
 * Generate a document from a base64 DOCX template + JSON data.
 * Matches the exact pattern from Foxit's official blog examples.
 */
export async function generateDocument(
  templateBase64: string,
  data: Record<string, unknown>,
  outputFormat: "pdf" | "docx" = "pdf"
): Promise<DocGenResponse> {
  const headers = {
    client_id: FOXIT_CLIENT_ID,
    client_secret: FOXIT_CLIENT_SECRET,
    "Content-Type": "application/json",
  };

  const body = {
    outputFormat,
    documentValues: data,
    base64FileString: templateBase64,
  };

  const url = `${FOXIT_HOST}/document-generation/api/GenerateDocumentBase64`;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Foxit Doc Gen failed (${res.status}) [${url}]: ${text}`
    );
  }

  return res.json();
}
