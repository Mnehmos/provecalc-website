/**
 * POST /api/foxit/generate
 *
 * Generates a verified PDF report from worksheet data using:
 * 1. Foxit Document Generation API — injects data into DOCX template → PDF
 * 2. Foxit PDF Services API — adds watermark to the generated PDF
 *
 * Returns: base64-encoded PDF for client-side download
 */

import { NextRequest, NextResponse } from "next/server";
import {
  generateDocument,
  uploadDocument,
  addWatermark,
  pollTask,
  downloadDocument,
} from "../../../../services/foxitService";
import {
  buildTemplateDocx,
  flattenWorksheetData,
  type WorksheetExportData,
} from "../../../../services/foxitTemplateBuilder";

export async function POST(req: NextRequest) {
  try {
    const body: WorksheetExportData = await req.json();

    // Verify env vars are set
    const baseUrl = process.env.FOXIT_BASE_URL;
    const clientId = process.env.FOXIT_CLIENT_ID;
    if (!baseUrl || !clientId) {
      return NextResponse.json(
        { error: "Foxit API credentials not configured", hasBaseUrl: !!baseUrl, hasClientId: !!clientId, hasSecret: !!process.env.FOXIT_CLIENT_SECRET },
        { status: 500 }
      );
    }

    // --- Step 1: Document Generation API ---
    // Build DOCX template with {{ tokens }}
    const templateBase64 = await buildTemplateDocx();

    // Flatten worksheet data to token values
    const tokenValues = flattenWorksheetData(body);

    console.log("Foxit Doc Gen: sending request to", baseUrl);
    console.log("Foxit Doc Gen: token keys:", Object.keys(tokenValues));

    // Call Foxit Doc Gen API: template + data → PDF
    const docGenResult = await generateDocument(templateBase64, tokenValues, "pdf");
    console.log("Foxit Doc Gen: result keys:", Object.keys(docGenResult));

    if (!docGenResult.base64FileString) {
      // If Doc Gen fails (e.g., free plan limits), fall back to returning
      // the template as-is so we still demonstrate the API integration
      return NextResponse.json(
        { error: "Document generation returned no result", details: docGenResult },
        { status: 502 }
      );
    }

    // --- Step 2: PDF Services API ---
    // Upload the generated PDF to add watermark
    let finalBase64 = docGenResult.base64FileString;

    try {
      const pdfBuffer = Buffer.from(docGenResult.base64FileString, "base64");
      const uploaded = await uploadDocument(pdfBuffer, "provecalc-report.pdf");

      // Add "PROVECALC VERIFIED" watermark
      const watermarkTask = await addWatermark(uploaded.documentId);

      // Poll until watermark is applied
      const completedTask = await pollTask(watermarkTask.taskId);

      // Download the watermarked PDF
      if (completedTask.documentId) {
        const watermarkedPdf = await downloadDocument(completedTask.documentId);
        finalBase64 = watermarkedPdf.toString("base64");
      }
    } catch (watermarkError) {
      // If PDF Services watermark fails, still return the Doc Gen result
      // This ensures we always return something useful
      console.warn(
        "Foxit PDF Services watermark step failed, returning unwatermarked PDF:",
        watermarkError
      );
    }

    return NextResponse.json({
      success: true,
      pdf: finalBase64,
      steps: {
        docGeneration: "completed",
        watermark: finalBase64 !== docGenResult.base64FileString ? "completed" : "skipped",
      },
    });
  } catch (error) {
    console.error("Foxit generate error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack?.split("\n").slice(0, 5).join("\n") : undefined;
    return NextResponse.json(
      {
        error: "Failed to generate report",
        details: msg,
        stack,
      },
      { status: 500 }
    );
  }
}
