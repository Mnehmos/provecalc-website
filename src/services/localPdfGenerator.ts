/**
 * Local PDF Generator — fallback when Foxit API is unavailable.
 *
 * Uses pdf-lib to create a "Certificate of Computation" PDF
 * with the same data that would go to Foxit Doc Gen.
 */

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { WorksheetExportData } from "./foxitTemplateBuilder";

const PURPLE = rgb(0.486, 0.227, 0.929); // #7c3aed
const DARK = rgb(0.13, 0.13, 0.13);
const GRAY = rgb(0.4, 0.4, 0.4);
const GREEN = rgb(0.086, 0.635, 0.286);
const WHITE = rgb(1, 1, 1);

export async function generateLocalPdf(
  data: WorksheetExportData
): Promise<string> {
  const doc = await PDFDocument.create();
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const courier = await doc.embedFont(StandardFonts.Courier);

  const page = doc.addPage([612, 792]); // US Letter
  const { width, height } = page.getSize();
  let y = height - 60;

  // --- Header ---
  const title = "PROVECALC";
  const titleWidth = helveticaBold.widthOfTextAtSize(title, 28);
  page.drawText(title, {
    x: (width - titleWidth) / 2,
    y,
    size: 28,
    font: helveticaBold,
    color: PURPLE,
  });
  y -= 30;

  const subtitle = "Certificate of Computation";
  const subWidth = helveticaBold.widthOfTextAtSize(subtitle, 18);
  page.drawText(subtitle, {
    x: (width - subWidth) / 2,
    y,
    size: 18,
    font: helveticaBold,
    color: DARK,
  });
  y -= 20;

  // Divider line
  page.drawLine({
    start: { x: 50, y },
    end: { x: width - 50, y },
    thickness: 1.5,
    color: PURPLE,
  });
  y -= 30;

  // --- Document Info ---
  const drawField = (label: string, value: string, color = DARK) => {
    page.drawText(label, { x: 50, y, size: 11, font: helveticaBold, color: DARK });
    page.drawText(value, {
      x: 50 + helveticaBold.widthOfTextAtSize(label, 11) + 4,
      y,
      size: 11,
      font: helvetica,
      color,
    });
    y -= 18;
  };

  drawField("Worksheet: ", data.title);
  drawField("Author: ", data.author);
  drawField("Date: ", data.date);
  drawField("Verification Score: ", data.verificationScore, GREEN);
  y -= 10;

  // --- Summary Table ---
  const drawSection = (title: string) => {
    page.drawRectangle({ x: 50, y: y - 2, width: width - 100, height: 20, color: PURPLE });
    page.drawText(title, { x: 56, y: y + 2, size: 12, font: helveticaBold, color: WHITE });
    y -= 28;
  };

  const drawRow = (label: string, value: string, shaded = false) => {
    if (shaded) {
      page.drawRectangle({
        x: 50, y: y - 4, width: width - 100, height: 18,
        color: rgb(0.95, 0.95, 0.97),
      });
    }
    page.drawText(label, { x: 56, y, size: 10, font: helveticaBold, color: DARK });
    page.drawText(value, { x: 250, y, size: 10, font: helvetica, color: DARK });
    y -= 18;
  };

  drawSection("Worksheet Summary");
  drawRow("Total Nodes", String(data.nodeCount), false);
  drawRow("Given Variables", String(data.givenCount), true);
  drawRow("Equations", String(data.equationCount), false);
  drawRow("Solve Goals", String(data.solveCount), true);
  drawRow("Verified", `${data.verifiedCount} / ${data.totalNodes}`, false);
  y -= 10;

  // --- Variables ---
  if (data.variables.length > 0) {
    drawSection("Input Variables");
    for (const v of data.variables) {
      const line = `${v.symbol} = ${v.value}${v.unit ? " " + v.unit : ""}`;
      page.drawText(line, { x: 56, y, size: 10, font: courier, color: DARK });
      y -= 16;
      if (y < 80) { break; }
    }
    y -= 6;
  }

  // --- Equations ---
  if (data.equations.length > 0) {
    drawSection("Equations");
    for (const eq of data.equations) {
      const display = eq.length > 80 ? eq.substring(0, 77) + "..." : eq;
      page.drawText(display, { x: 56, y, size: 10, font: courier, color: DARK });
      y -= 16;
      if (y < 80) { break; }
    }
    y -= 6;
  }

  // --- Results ---
  if (data.results.length > 0) {
    drawSection("Results");
    for (const r of data.results) {
      const line = `${r.symbol} = ${r.value}${r.unit ? " " + r.unit : ""}`;
      page.drawText(line, { x: 56, y, size: 10, font: courier, color: DARK });
      y -= 16;
      if (y < 80) { break; }
    }
    y -= 6;
  }

  // --- Assumptions ---
  if (data.assumptions.length > 0 && y > 120) {
    drawSection("Assumptions");
    for (const a of data.assumptions) {
      const display = a.length > 80 ? a.substring(0, 77) + "..." : a;
      page.drawText(display, { x: 56, y, size: 10, font: helvetica, color: GRAY });
      y -= 16;
      if (y < 80) { break; }
    }
  }

  // --- Watermark ---
  const wmText = "PROVECALC VERIFIED";
  const wmSize = 48;
  const wmWidth = helveticaBold.widthOfTextAtSize(wmText, wmSize);
  page.drawText(wmText, {
    x: (width - wmWidth * 0.7) / 2,
    y: height / 2 - 20,
    size: wmSize,
    font: helveticaBold,
    color: rgb(0.486, 0.227, 0.929),
    opacity: 0.08,
    rotate: { type: "degrees" as const, angle: -45 },
  });

  // --- Footer ---
  page.drawLine({
    start: { x: 50, y: 50 },
    end: { x: width - 50, y: 50 },
    thickness: 1,
    color: PURPLE,
  });

  const footer = "Generated by ProveCalc — Engine-Verified Engineering Calculations";
  const footerWidth = helvetica.widthOfTextAtSize(footer, 8);
  page.drawText(footer, {
    x: (width - footerWidth) / 2,
    y: 38,
    size: 8,
    font: helvetica,
    color: GRAY,
  });

  const url = "provecalc.com";
  const urlWidth = helvetica.widthOfTextAtSize(url, 8);
  page.drawText(url, {
    x: (width - urlWidth) / 2,
    y: 28,
    size: 8,
    font: helvetica,
    color: PURPLE,
  });

  const bytes = await doc.save();
  return Buffer.from(bytes).toString("base64");
}
