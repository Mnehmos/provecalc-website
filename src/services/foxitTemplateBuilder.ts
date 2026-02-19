/**
 * Builds a DOCX template with {{ tokens }} for Foxit Document Generation API.
 *
 * Creates a professional "Certificate of Computation" template that Foxit's
 * Doc Gen API will fill with worksheet data.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
} from "docx";

export interface NodeVerificationInfo {
  id: string;
  type: string;
  label: string;
  status: "verified" | "failed" | "unverified" | "pending";
  dependsOn: string[];   // symbols/labels of upstream nodes
  dependedBy: string[];  // symbols/labels of downstream nodes
}

export interface WorksheetExportData {
  title: string;
  author: string;
  date: string;
  nodeCount: number;
  equationCount: number;
  givenCount: number;
  solveCount: number;
  verifiedCount: number;
  totalNodes: number;
  verificationScore: string;
  assumptions: string[];
  variables: Array<{ symbol: string; value: string; unit: string; verified: boolean }>;
  equations: Array<{ expression: string; lhs: string; rhs: string; verified: boolean }>;
  solveGoals: Array<{ target: string; verified: boolean }>;
  results: Array<{ symbol: string; value: string; unit: string; verified: boolean; symbolicForm?: string }>;
  dependencyGraph: NodeVerificationInfo[];
}

/**
 * Build a DOCX document with Foxit template tokens {{ field }}.
 * Returns base64-encoded DOCX string.
 */
export async function buildTemplateDocx(): Promise<string> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "PROVECALC",
                bold: true,
                size: 48,
                color: "7c3aed",
                font: "Arial",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Certificate of Computation",
                bold: true,
                size: 32,
                color: "333333",
                font: "Arial",
              }),
            ],
          }),

          // Divider
          new Paragraph({
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 2, color: "7c3aed" },
            },
            spacing: { after: 300 },
            children: [],
          }),

          // Document Info
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({ text: "Worksheet: ", bold: true, size: 22, font: "Arial" }),
              new TextRun({ text: "{{ title }}", size: 22, font: "Arial" }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({ text: "Author: ", bold: true, size: 22, font: "Arial" }),
              new TextRun({ text: "{{ author }}", size: 22, font: "Arial" }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({ text: "Date: ", bold: true, size: 22, font: "Arial" }),
              new TextRun({ text: "{{ date }}", size: 22, font: "Arial" }),
            ],
          }),
          new Paragraph({
            spacing: { after: 300 },
            children: [
              new TextRun({ text: "Verification Score: ", bold: true, size: 22, font: "Arial" }),
              new TextRun({ text: "{{ verificationScore }}", size: 22, color: "16a34a", font: "Arial" }),
            ],
          }),

          // Summary section
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({ text: "Worksheet Summary", bold: true, size: 26, color: "7c3aed", font: "Arial" }),
            ],
          }),

          // Stats table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              makeTableRow("Total Nodes", "{{ nodeCount }}"),
              makeTableRow("Given Variables", "{{ givenCount }}"),
              makeTableRow("Equations", "{{ equationCount }}"),
              makeTableRow("Solve Goals", "{{ solveCount }}"),
              makeTableRow("Verified Nodes", "{{ verifiedCount }} / {{ totalNodes }}"),
            ],
          }),

          // Variables section
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 },
            children: [
              new TextRun({ text: "Input Variables", bold: true, size: 26, color: "7c3aed", font: "Arial" }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: "{{ variablesSummary }}", size: 20, font: "Courier New" }),
            ],
          }),

          // Equations section
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({ text: "Equations", bold: true, size: 26, color: "7c3aed", font: "Arial" }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: "{{ equationsSummary }}", size: 20, font: "Courier New" }),
            ],
          }),

          // Results section
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({ text: "Results", bold: true, size: 26, color: "7c3aed", font: "Arial" }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: "{{ resultsSummary }}", size: 20, font: "Courier New" }),
            ],
          }),

          // Assumptions section
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({ text: "Assumptions", bold: true, size: 26, color: "7c3aed", font: "Arial" }),
            ],
          }),
          new Paragraph({
            spacing: { after: 300 },
            children: [
              new TextRun({ text: "{{ assumptionsSummary }}", size: 20, font: "Arial", italics: true }),
            ],
          }),

          // Footer
          new Paragraph({
            border: {
              top: { style: BorderStyle.SINGLE, size: 2, color: "7c3aed" },
            },
            spacing: { before: 400 },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "Generated by ProveCalc — Engine-Verified Engineering Calculations",
                size: 18,
                color: "666666",
                font: "Arial",
                italics: true,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "provecalc.com",
                size: 18,
                color: "7c3aed",
                font: "Arial",
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer).toString("base64");
}

function makeTableRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 40, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: label, bold: true, size: 20, font: "Arial" }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 60, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: value, size: 20, font: "Arial" }),
            ],
          }),
        ],
      }),
    ],
  });
}

/**
 * Flatten worksheet data into the token values Foxit Doc Gen expects.
 */
export function flattenWorksheetData(data: WorksheetExportData): Record<string, string> {
  return {
    title: data.title,
    author: data.author,
    date: data.date,
    nodeCount: String(data.nodeCount),
    equationCount: String(data.equationCount),
    givenCount: String(data.givenCount),
    solveCount: String(data.solveCount),
    verifiedCount: String(data.verifiedCount),
    totalNodes: String(data.totalNodes),
    verificationScore: data.verificationScore,
    variablesSummary: data.variables.length > 0
      ? data.variables.map((v) => `${v.symbol} = ${v.value} ${v.unit}`).join("\n")
      : "No variables defined",
    equationsSummary: data.equations.length > 0
      ? data.equations.map((e) => `${e.lhs} = ${e.rhs}`).join("\n")
      : "No equations defined",
    resultsSummary: data.results.length > 0
      ? data.results.map((r) => `${r.symbol} = ${r.value} ${r.unit}`).join("\n")
      : "No results computed",
    assumptionsSummary: data.assumptions.length > 0
      ? data.assumptions.join("\n")
      : "No assumptions declared",
  };
}
