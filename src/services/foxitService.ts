/**
 * Foxit API Service — Document Generation + PDF Services
 *
 * Flow:
 * 1. Build a DOCX template with {{ tokens }} from worksheet data
 * 2. POST to Doc Gen API → returns base64 PDF
 * 3. Upload PDF to PDF Services → add watermark → download final
 */

const FOXIT_BASE_URL = process.env.FOXIT_BASE_URL || "https://na1.fusion.foxit.com";
const FOXIT_CLIENT_ID = process.env.FOXIT_CLIENT_ID || "";
const FOXIT_CLIENT_SECRET = process.env.FOXIT_CLIENT_SECRET || "";

function foxitHeaders(): Record<string, string> {
  return {
    client_id: FOXIT_CLIENT_ID,
    client_secret: FOXIT_CLIENT_SECRET,
    "Content-Type": "application/json",
  };
}

// ---------- Document Generation API ----------

export interface DocGenRequest {
  outputFormat: "pdf" | "docx";
  documentValues: Record<string, unknown>;
  base64FileString: string;
}

export interface DocGenResponse {
  base64FileString: string;
  error?: string;
}

/**
 * Generate a document from a base64 DOCX template + JSON data.
 * Returns a base64-encoded PDF (or DOCX).
 */
export async function generateDocument(
  templateBase64: string,
  data: Record<string, unknown>,
  outputFormat: "pdf" | "docx" = "pdf"
): Promise<DocGenResponse> {
  const body: DocGenRequest = {
    outputFormat,
    documentValues: data,
    base64FileString: templateBase64,
  };

  const res = await fetch(
    `${FOXIT_BASE_URL}/document-generation/api/GenerateDocumentBase64`,
    {
      method: "POST",
      headers: foxitHeaders(),
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Foxit Doc Gen failed (${res.status}): ${text}`);
  }

  return res.json();
}

// ---------- PDF Services API ----------

interface UploadResponse {
  documentId: string;
}

interface TaskResponse {
  taskId: string;
  status: string;
  documentId?: string;
}

/**
 * Upload a document (binary) to PDF Services.
 */
export async function uploadDocument(
  fileBuffer: Buffer,
  filename: string
): Promise<UploadResponse> {
  const formData = new FormData();
  const uint8 = new Uint8Array(fileBuffer);
  const blob = new Blob([uint8], { type: "application/pdf" });
  formData.append("inputDocument", blob, filename);

  const res = await fetch(
    `${FOXIT_BASE_URL}/pdf-services/api/documents/upload`,
    {
      method: "POST",
      headers: {
        client_id: FOXIT_CLIENT_ID,
        client_secret: FOXIT_CLIENT_SECRET,
      },
      body: formData,
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Foxit upload failed (${res.status}): ${text}`);
  }

  return res.json();
}

/**
 * Add a text watermark to an uploaded PDF.
 */
export async function addWatermark(
  documentId: string,
  text: string = "PROVECALC VERIFIED"
): Promise<TaskResponse> {
  const res = await fetch(
    `${FOXIT_BASE_URL}/pdf-services/api/documents/add-watermark`,
    {
      method: "POST",
      headers: foxitHeaders(),
      body: JSON.stringify({
        documentId,
        watermarkType: "text",
        text,
        fontSize: 48,
        fontColor: "#7c3aed",
        opacity: 0.15,
        rotation: -45,
        position: "center",
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Foxit watermark failed (${res.status}): ${text}`);
  }

  return res.json();
}

/**
 * Poll a task until complete.
 */
export async function pollTask(
  taskId: string,
  maxAttempts = 30,
  intervalMs = 2000
): Promise<TaskResponse> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(
      `${FOXIT_BASE_URL}/pdf-services/api/tasks/${taskId}`,
      {
        headers: {
          client_id: FOXIT_CLIENT_ID,
          client_secret: FOXIT_CLIENT_SECRET,
        },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Foxit task poll failed (${res.status}): ${text}`);
    }

    const task: TaskResponse = await res.json();
    if (task.status === "completed" || task.status === "done") {
      return task;
    }
    if (task.status === "failed" || task.status === "error") {
      throw new Error(`Foxit task failed: ${JSON.stringify(task)}`);
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error("Foxit task timed out");
}

/**
 * Download a processed document.
 */
export async function downloadDocument(documentId: string): Promise<Buffer> {
  const res = await fetch(
    `${FOXIT_BASE_URL}/pdf-services/api/documents/${documentId}/download`,
    {
      headers: {
        client_id: FOXIT_CLIENT_ID,
        client_secret: FOXIT_CLIENT_SECRET,
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Foxit download failed (${res.status}): ${text}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
