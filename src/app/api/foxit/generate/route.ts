/**
 * POST /api/foxit/generate
 *
 * Generates a calculation review PDF from worksheet data.
 *
 * Strategy:
 * 1. Try Foxit Document Generation API (template + data → PDF)
 * 2. If Foxit fails, generate PDF locally with pdf-lib
 *
 * Returns: base64-encoded PDF for client-side download.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateDocument } from "../../../../services/foxitService";
import {
  buildTemplateDocx,
  flattenWorksheetData,
  type WorksheetExportData,
} from "../../../../services/foxitTemplateBuilder";
import { generateLocalPdf } from "../../../../services/localPdfGenerator";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body: WorksheetExportData = await req.json();

    // Try Foxit Document Generation API first
    const hasFoxitCreds =
      process.env.FOXIT_BASE_URL &&
      process.env.FOXIT_CLIENT_ID &&
      process.env.FOXIT_CLIENT_SECRET;

    if (hasFoxitCreds) {
      try {
        const templateBase64 = await buildTemplateDocx();
        const tokenValues = flattenWorksheetData(body);
        const result = await generateDocument(templateBase64, tokenValues, "pdf");

        if (result.base64FileString) {
          return NextResponse.json({
            success: true,
            pdf: result.base64FileString,
            engine: "foxit",
          });
        }
      } catch (foxitErr) {
        console.warn(
          "Foxit API failed, falling back to local PDF:",
          foxitErr instanceof Error ? foxitErr.message : foxitErr
        );
      }
    }

    // Fallback: generate PDF locally with pdf-lib
    const pdf = await generateLocalPdf(body);

    return NextResponse.json({
      success: true,
      pdf,
      engine: "local",
    });
  } catch (error) {
    console.error("PDF generate error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to generate report", details: msg },
      { status: 500 }
    );
  }
}
