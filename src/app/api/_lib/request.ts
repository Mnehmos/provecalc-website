export const DEFAULT_JSON_BODY_LIMIT = 256 * 1024;

export class RequestBodyError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 413,
  ) {
    super(message);
    this.name = "RequestBodyError";
  }
}

export async function readJsonBody<T>(
  request: Request,
  maxBytes = DEFAULT_JSON_BODY_LIMIT,
): Promise<T> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const declaredBytes = Number(contentLength);
    if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
      throw new RequestBodyError("Request body is too large.", 413);
    }
  }

  const raw = await request.text();
  const actualBytes = new TextEncoder().encode(raw).byteLength;
  if (actualBytes > maxBytes) {
    throw new RequestBodyError("Request body is too large.", 413);
  }
  if (!raw.trim()) {
    throw new RequestBodyError("Request body is required.", 400);
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new RequestBodyError("Request body must be valid JSON.", 400);
  }
}

export function getRequestBodyError(error: unknown): RequestBodyError | null {
  return error instanceof RequestBodyError ? error : null;
}
