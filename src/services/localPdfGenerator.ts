/**
 * Local PDF Generator — fallback when Foxit API is unavailable.
 *
 * Uses pdf-lib to create a "Certificate of Computation" PDF
 * with full worksheet data including dependency graph.
 */

import { PDFDocument, rgb, StandardFonts, degrees, type PDFPage, type PDFFont, type RGB } from "pdf-lib";
import type { WorksheetExportData } from "./foxitTemplateBuilder";

const PURPLE = rgb(0.486, 0.227, 0.929); // #7c3aed
const DARK = rgb(0.13, 0.13, 0.13);
const GRAY = rgb(0.4, 0.4, 0.4);
const GREEN = rgb(0.086, 0.635, 0.286);
const RED = rgb(0.8, 0.15, 0.15);
const WHITE = rgb(1, 1, 1);
const LIGHT_BG = rgb(0.95, 0.95, 0.97);

const MARGIN = 50;
const PAGE_W = 612;
const PAGE_H = 792;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Verification status symbols (WinAnsi-safe)
const STATUS_ICON: Record<string, { symbol: string; color: RGB }> = {
  verified: { symbol: "[OK]", color: GREEN },
  failed: { symbol: "[X]", color: RED },
  unverified: { symbol: "[ ]", color: GRAY },
  pending: { symbol: "[..]", color: GRAY },
};

export async function generateLocalPdf(
  data: WorksheetExportData
): Promise<string> {
  const doc = await PDFDocument.create();
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const courier = await doc.embedFont(StandardFonts.Courier);

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - 60;

  // Helper: add new page if needed
  const ensureSpace = (needed: number) => {
    if (y < needed + 60) {
      drawFooter(page, helvetica);
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - 50;
    }
  };

  // --- Header ---
  const title = "PROVECALC";
  const titleWidth = helveticaBold.widthOfTextAtSize(title, 28);
  page.drawText(title, {
    x: (PAGE_W - titleWidth) / 2, y,
    size: 28, font: helveticaBold, color: PURPLE,
  });
  y -= 30;

  const subtitle = "Certificate of Computation";
  const subWidth = helveticaBold.widthOfTextAtSize(subtitle, 18);
  page.drawText(subtitle, {
    x: (PAGE_W - subWidth) / 2, y,
    size: 18, font: helveticaBold, color: DARK,
  });
  y -= 20;

  page.drawLine({
    start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y },
    thickness: 1.5, color: PURPLE,
  });
  y -= 30;

  // --- Document Info ---
  const drawField = (label: string, value: string, color = DARK) => {
    page.drawText(label, { x: MARGIN, y, size: 11, font: helveticaBold, color: DARK });
    page.drawText(value, {
      x: MARGIN + helveticaBold.widthOfTextAtSize(label, 11) + 4,
      y, size: 11, font: helvetica, color,
    });
    y -= 18;
  };

  drawField("Worksheet: ", data.title);
  drawField("Author: ", data.author);
  drawField("Date: ", data.date);
  const scoreColor = data.verifiedCount > 0 ? GREEN : GRAY;
  drawField("Verification Score: ", data.verificationScore, scoreColor);
  y -= 10;

  // --- Summary Table ---
  const drawSection = (heading: string) => {
    ensureSpace(30);
    page.drawRectangle({ x: MARGIN, y: y - 2, width: CONTENT_W, height: 20, color: PURPLE });
    page.drawText(heading, { x: MARGIN + 6, y: y + 2, size: 12, font: helveticaBold, color: WHITE });
    y -= 28;
  };

  const drawRow = (label: string, value: string, shaded = false) => {
    ensureSpace(20);
    if (shaded) {
      page.drawRectangle({ x: MARGIN, y: y - 4, width: CONTENT_W, height: 18, color: LIGHT_BG });
    }
    page.drawText(label, { x: MARGIN + 6, y, size: 10, font: helveticaBold, color: DARK });
    page.drawText(value, { x: 250, y, size: 10, font: helvetica, color: DARK });
    y -= 18;
  };

  drawSection("Worksheet Summary");
  drawRow("Total Nodes", String(data.nodeCount), false);
  drawRow("Given Variables", String(data.givenCount), true);
  drawRow("Equations", String(data.equationCount), false);
  drawRow("Solve Goals", String(data.solveCount), true);
  drawRow("Verified", `${data.verifiedCount} / ${data.totalNodes}`, false);
  y -= 8;

  // --- Variables (with verification status) ---
  if (data.variables.length > 0) {
    drawSection("Input Variables");
    for (const v of data.variables) {
      ensureSpace(18);
      const status = v.verified ? STATUS_ICON.verified : STATUS_ICON.unverified;
      const line = `${v.symbol} = ${v.value}${v.unit ? " " + v.unit : ""}`;
      page.drawText(status.symbol, { x: MARGIN + 6, y, size: 10, font: helvetica, color: status.color });
      page.drawText(line, { x: MARGIN + 20, y, size: 10, font: courier, color: DARK });
      y -= 16;
    }
    y -= 6;
  }

  // --- Equations (with lhs = rhs) ---
  if (data.equations.length > 0) {
    drawSection("Equations");
    for (const eq of data.equations) {
      ensureSpace(18);
      const status = eq.verified ? STATUS_ICON.verified : STATUS_ICON.unverified;
      const display = `${eq.lhs} = ${eq.rhs}`;
      const truncated = display.length > 75 ? display.substring(0, 72) + "..." : display;
      page.drawText(status.symbol, { x: MARGIN + 6, y, size: 10, font: helvetica, color: status.color });
      page.drawText(truncated, { x: MARGIN + 20, y, size: 10, font: courier, color: DARK });
      y -= 16;
    }
    y -= 6;
  }

  // --- Solve Goals ---
  if (data.solveGoals && data.solveGoals.length > 0) {
    drawSection("Solve Goals");
    for (const sg of data.solveGoals) {
      ensureSpace(18);
      const status = sg.verified ? STATUS_ICON.verified : STATUS_ICON.unverified;
      page.drawText(status.symbol, { x: MARGIN + 6, y, size: 10, font: helvetica, color: status.color });
      page.drawText(`Solve for: ${sg.target}`, { x: MARGIN + 20, y, size: 10, font: courier, color: DARK });
      y -= 16;
    }
    y -= 6;
  }

  // --- Results ---
  if (data.results.length > 0) {
    drawSection("Results");
    for (const r of data.results) {
      ensureSpace(28);
      const status = r.verified ? STATUS_ICON.verified : STATUS_ICON.unverified;
      const line = `${r.symbol} = ${r.value}${r.unit ? " " + r.unit : ""}`;
      page.drawText(status.symbol, { x: MARGIN + 6, y, size: 10, font: helvetica, color: status.color });
      page.drawText(line, { x: MARGIN + 20, y, size: 10, font: courier, color: DARK });
      y -= 16;
      if (r.symbolicForm) {
        page.drawText(`symbolic: ${r.symbolicForm}`, { x: MARGIN + 20, y, size: 8, font: helvetica, color: GRAY });
        y -= 14;
      }
    }
    y -= 6;
  }

  // --- Dependency Graph (ASCII-style) ---
  if (data.dependencyGraph && data.dependencyGraph.length > 0) {
    const nodesWithDeps = data.dependencyGraph.filter(
      (n) => n.dependsOn.length > 0 || n.dependedBy.length > 0
    );
    if (nodesWithDeps.length > 0) {
      drawSection("Dependency Graph");
      for (const node of nodesWithDeps) {
        ensureSpace(30);
        const st = STATUS_ICON[node.status] || STATUS_ICON.unverified;
        page.drawText(st.symbol, { x: MARGIN + 6, y, size: 10, font: helvetica, color: st.color });
        page.drawText(`${node.label}`, {
          x: MARGIN + 20, y, size: 10, font: helveticaBold, color: DARK,
        });
        const typeLabel = `[${node.type}]`;
        page.drawText(typeLabel, {
          x: MARGIN + 22 + helveticaBold.widthOfTextAtSize(node.label, 10),
          y, size: 8, font: helvetica, color: GRAY,
        });
        y -= 14;
        if (node.dependsOn.length > 0) {
          const depText = `  depends on: ${node.dependsOn.join(", ")}`;
          const truncDep = depText.length > 85 ? depText.substring(0, 82) + "..." : depText;
          page.drawText(truncDep, { x: MARGIN + 20, y, size: 8, font: helvetica, color: GRAY });
          y -= 12;
        }
        if (node.dependedBy.length > 0) {
          const byText = `  feeds into: ${node.dependedBy.join(", ")}`;
          const truncBy = byText.length > 85 ? byText.substring(0, 82) + "..." : byText;
          page.drawText(truncBy, { x: MARGIN + 20, y, size: 8, font: helvetica, color: GRAY });
          y -= 12;
        }
      }
      y -= 6;
    }
  }

  // --- Assumptions ---
  if (data.assumptions.length > 0) {
    drawSection("Assumptions");
    for (const a of data.assumptions) {
      ensureSpace(18);
      const display = a.length > 80 ? a.substring(0, 77) + "..." : a;
      page.drawText(`- ${display}`, { x: MARGIN + 6, y, size: 10, font: helvetica, color: GRAY });
      y -= 16;
    }
  }

  // --- Watermark (on first page only) ---
  const firstPage = doc.getPage(0);
  const wmText = "PROVECALC VERIFIED";
  const wmSize = 48;
  const wmWidth = helveticaBold.widthOfTextAtSize(wmText, wmSize);
  firstPage.drawText(wmText, {
    x: (PAGE_W - wmWidth * 0.7) / 2,
    y: PAGE_H / 2 - 20,
    size: wmSize,
    font: helveticaBold,
    color: PURPLE,
    opacity: 0.06,
    rotate: degrees(-45),
  });

  // Footer on last page
  drawFooter(page, helvetica);

  const bytes = await doc.save();
  return Buffer.from(bytes).toString("base64");
}

function drawFooter(page: PDFPage, helvetica: PDFFont) {
  page.drawLine({
    start: { x: MARGIN, y: 50 },
    end: { x: PAGE_W - MARGIN, y: 50 },
    thickness: 1,
    color: PURPLE,
  });

  const footer = "Generated by ProveCalc (pdf-lib) — Engine-Verified Engineering Calculations";
  const footerWidth = helvetica.widthOfTextAtSize(footer, 8);
  page.drawText(footer, {
    x: (PAGE_W - footerWidth) / 2, y: 38,
    size: 8, font: helvetica, color: GRAY,
  });

  const url = "provecalc.com";
  const urlWidth = helvetica.widthOfTextAtSize(url, 8);
  page.drawText(url, {
    x: (PAGE_W - urlWidth) / 2, y: 28,
    size: 8, font: helvetica, color: PURPLE,
  });
}
