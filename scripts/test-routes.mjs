import { spawn } from "node:child_process";

const port = process.env.PORT || "3199";
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [
  "node_modules/next/dist/bin/next",
  "start",
  "-p",
  port,
], {
  env: {
    ...process.env,
    PORT: port,
    PAID_CHECKOUT_ENABLED: "false",
    NEXT_PUBLIC_PAID_CHECKOUT_ENABLED: "false",
    CONTACT_FORM_ENABLED: "false",
    REPORT_GENERATION_ENABLED: "false",
    NEXT_TELEMETRY_DISABLED: "1",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let output = "";
server.stdout.on("data", (chunk) => { output += chunk.toString(); });
server.stderr.on("data", (chunk) => { output += chunk.toString(); });

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/foxit/test`);
      if (response.status === 410) return;
    } catch {
      // The Next server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for Next.js server.\n${output}`);
}

async function assertStatus(path, init, expected) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = await response.text();
  if (response.status !== expected) {
    throw new Error(`${path}: expected ${expected}, got ${response.status}: ${body}`);
  }
  return { response, body };
}

try {
  await waitForServer();
  await assertStatus("/api/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  }, 503);
  await assertStatus("/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "CI", email: "ci@example.com", message: "route smoke" }),
  }, 503);
  await assertStatus("/api/foxit/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  }, 503);
  const diagnostics = await assertStatus("/api/foxit/test", undefined, 410);
  if (!diagnostics.body.includes("disabled")) {
    throw new Error("Provider diagnostics route did not return the production-disabled response");
  }
  const home = await assertStatus("/", undefined, 200);
  if (!home.response.headers.get("content-security-policy")) {
    throw new Error("Landing page is missing Content-Security-Policy");
  }
  console.log("Default-off route smoke passed");
} finally {
  server.kill("SIGTERM");
  await new Promise((resolve) => {
    if (server.exitCode !== null) {
      resolve();
      return;
    }
    server.once("close", resolve);
    setTimeout(resolve, 5_000).unref();
  });
}
