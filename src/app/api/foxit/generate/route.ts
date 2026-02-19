/**
 * POST /api/foxit/generate
 *
 * Generates a verified PDF report from worksheet data using
 * Foxit Document Generation API (DOCX template + JSON → PDF).
 *
 * Returns: base64-encoded PDF for client-side download.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateDocument } from "../../../../services/foxitService";
import {
  buildTemplateDocx,
  flattenWorksheetData,
  type WorksheetExportData,
} from "../../../../services/foxitTemplateBuilder";

export async function POST(req: NextRequest) {
  try {
    const body: WorksheetExportData = await req.json();

    // Verify env vars are set
    const host = process.env.FOXIT_BASE_URL;
    const clientId = process.env.FOXIT_CLIENT_ID;
    const secret = process.env.FOXIT_CLIENT_SECRET;
    if (!host || !clientId || !secret) {
      return NextResponse.json(
        {
          error: "Foxit API credentials not configured",
          hasHost: !!host,
          hasClientId: !!clientId,
          hasSecret: !!secret,
        },
        { status: 500 }
      );
    }

    // Build DOCX template with {{ tokens }}
    const templateBase64 = await buildTemplateDocx();

    // Flatten worksheet data to token values
    const tokenValues = flattenWorksheetData(body);

    // Call Foxit Doc Gen API: template + data → PDF
    const result = await generateDocument(templateBase64, tokenValues, "pdf");

    if (!result.base64FileString) {
      return NextResponse.json(
        { error: "Document generation returned no PDF", details: result },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      pdf: result.base64FileString,
    });
  } catch (error) {
    console.error("Foxit generate error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to generate report", details: msg },
      { status: 500 }
    );
  }
}
