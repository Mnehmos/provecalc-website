/**
 * Server-side relay from the browser demo to the ProveCalc compute sidecar.
 *
 * The public sidecar requires a bearer key on every compute route. The key
 * stays on the server: the browser calls /api/compute/<route>, and this
 * handler forwards allowlisted routes with the key, a size cap, a timeout,
 * and a per-client rate limit. Request and response bodies are never logged.
 *
 * Environment:
 *   PROVECALC_API_URL   sidecar base URL (e.g. the Railway service URL)
 *   PROVECALC_API_KEY   the sidecar's bearer key
 *   DEMO_RATE_LIMIT_PER_MINUTE  optional, per client IP (default 120)
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const POST_ROUTES = new Set([
  "compute/evaluate",
  "compute/check_units",
  "compute/solve",
  "compute/solve_numeric",
  "compute/analyze_system",
  "compute/validate_equation",
  "compute/simplify",
  "compute/differentiate",
  "compute/integrate",
  "compute/plot_data",
  "units/convert",
  "units/domain/batch",
  "export/docx",
]);
const GET_EXACT = new Set(["health", "units/domains", "constants"]);
const GET_PREFIXES = ["units/dimensions/", "units/domain/", "constants/"];

const MAX_BODY_BYTES = 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 40_000;
const WINDOW_MS = 60_000;
const MAX_TRACKED_CLIENTS = 10_000;

const hits = new Map<string, number[]>();

function rateLimit(): number {
  const value = Number(process.env.DEMO_RATE_LIMIT_PER_MINUTE);
  return Number.isFinite(value) && value > 0 ? value : 120;
}

/** Sliding-window limit per client. Returns seconds to wait, or 0 if allowed. */
function checkRate(client: string, now = Date.now()): number {
  const cutoff = now - WINDOW_MS;
  let times = hits.get(client);
  if (!times) {
    if (hits.size >= MAX_TRACKED_CLIENTS) {
      for (const [key, entries] of hits) {
        if (!entries.length || entries[entries.length - 1] <= cutoff) hits.delete(key);
      }
      if (hits.size >= MAX_TRACKED_CLIENTS) return 30;
    }
    times = [];
    hits.set(client, times);
  }
  while (times.length && times[0] <= cutoff) times.shift();
  if (times.length >= rateLimit()) {
    return Math.max(1, Math.ceil((times[0] + WINDOW_MS - now) / 1000));
  }
  times.push(now);
  return 0;
}

/**
 * The visitor's address as the hosting proxy saw it. Prefer X-Real-IP, which
 * the proxy sets, then the last X-Forwarded-For hop (the one the proxy
 * appended); a client can forge the earlier hops to dodge the limit.
 */
function clientId(req: NextRequest): string {
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const hops = req.headers.get("x-forwarded-for")?.split(",").map((h) => h.trim()).filter(Boolean);
  return hops?.[hops.length - 1] || "unknown";
}

function failure(status: number, code: string, message: string, retryable = false, headers?: HeadersInit) {
  return NextResponse.json(
    { success: false, error: { code, message, retryable } },
    { status, headers },
  );
}

function routeAllowed(method: string, route: string): boolean {
  if (method === "POST") return POST_ROUTES.has(route);
  return GET_EXACT.has(route) || GET_PREFIXES.some((p) => route.startsWith(p) && route.length > p.length);
}

async function relay(req: NextRequest, segments: string[]) {
  const route = segments.join("/");
  if (segments.some((s) => s === "" || s === "." || s === "..") || !routeAllowed(req.method, route)) {
    return failure(404, "NOT_FOUND", "This compute route is not available in the demo.");
  }

  const baseUrl = process.env.PROVECALC_API_URL;
  const apiKey = process.env.PROVECALC_API_KEY;
  if (!baseUrl || !apiKey) {
    return failure(503, "DEPENDENCY_UNAVAILABLE", "The demo compute engine is not configured.", true);
  }

  const wait = checkRate(clientId(req));
  if (wait) {
    return failure(429, "RATE_LIMITED", "Too many calculations at once. Wait a moment and try again.", true, {
      "Retry-After": String(wait),
    });
  }

  let body: string | undefined;
  if (req.method === "POST") {
    const declared = Number(req.headers.get("content-length") || 0);
    if (declared > MAX_BODY_BYTES) {
      return failure(413, "PAYLOAD_TOO_LARGE", "This worksheet is too large for the demo.");
    }
    body = await req.text();
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
      return failure(413, "PAYLOAD_TOO_LARGE", "This worksheet is too large for the demo.");
    }
  }

  const target = new URL(`${baseUrl.replace(/\/+$/, "")}/${segments.map(encodeURIComponent).join("/")}`);
  target.search = req.nextUrl.search;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    return timedOut
      ? failure(504, "REQUEST_TIMEOUT", "The calculation took too long.", true)
      : failure(503, "DEPENDENCY_UNAVAILABLE", "The compute engine could not be reached.", true);
  }

  if (upstream.status === 401 || upstream.status === 403) {
    // The relay's own key was refused: a server configuration problem, not the visitor's.
    return failure(503, "DEPENDENCY_UNAVAILABLE", "The demo compute engine is not configured.", true);
  }
  if (upstream.status === 429) {
    return failure(429, "RATE_LIMITED", "The demo is busy right now. Wait a moment and try again.", true, {
      "Retry-After": upstream.headers.get("retry-after") || "10",
    });
  }

  const headers = new Headers({ "Cache-Control": "no-store" });
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  for (const name of ["x-provecalc-error-id", "x-provecalc-request-id", "retry-after"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new NextResponse(await upstream.arrayBuffer(), { status: upstream.status, headers });
}

type Context = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, { params }: Context) {
  return relay(req, (await params).path);
}

export async function POST(req: NextRequest, { params }: Context) {
  return relay(req, (await params).path);
}
