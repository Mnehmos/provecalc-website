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
import {
  getRequestBodyError,
  readJsonBody,
} from "../../_lib/request";

const REPORT_GENERATION_ENABLED = process.env.REPORT_GENERATION_ENABLED === "true";
const MAX_REPORT_BODY_BYTES = 2 * 1024 * 1024;
const MAX_REPORT_ITEMS = 2_000;

export async function POST(req: NextRequest) {
  try {
    if (!REPORT_GENERATION_ENABLED) {
      return NextResponse.json(
        {
          error:
            "Report generation is temporarily closed while ProveCalc is in design-partner beta.",
        },
        { status: 503 },
      );
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await readJsonBody<WorksheetExportData>(req, MAX_REPORT_BODY_BYTES);
    if (
      !body ||
      typeof body !== "object" ||
      Object.values(body).some((value) => Array.isArray(value) && value.length > MAX_REPORT_ITEMS)
    ) {
      return NextResponse.json(
        { error: "Report payload is invalid or contains too many items." },
        { status: 400 },
      );
    }

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
    const bodyError = getRequestBodyError(error);
    if (bodyError) {
      return NextResponse.json(
        { error: bodyError.message },
        { status: bodyError.status },
      );
    }
    console.error("PDF generate error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to generate report", details: msg },
      { status: 500 }
    );
  }
}
