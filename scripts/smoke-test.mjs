import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { setTimeout as wait } from "node:timers/promises";

import { parseDotenv } from "./validate-env.mjs";

const remote = process.argv.includes("--remote");
const dev = process.argv.includes("--dev");
const targetArgument = process.argv.find((entry) => entry.startsWith("--url="));
const targetUrl = targetArgument?.slice("--url=".length).replace(/\/$/, "");
const port = Number(process.env.SMOKE_PORT ?? 4173);
const localEnvironment = existsSync(".env.local")
  ? parseDotenv(readFileSync(".env.local", "utf8"))
  : {};
const runtimeEnvironment = { ...localEnvironment, ...process.env };

runtimeEnvironment.SUPABASE_URL ??= runtimeEnvironment.VITE_SUPABASE_URL;
runtimeEnvironment.SUPABASE_PUBLISHABLE_KEY ??=
  runtimeEnvironment.VITE_SUPABASE_PUBLISHABLE_KEY;

process.env.SUPABASE_URL ??= runtimeEnvironment.SUPABASE_URL;
process.env.SUPABASE_PUBLISHABLE_KEY ??=
  runtimeEnvironment.SUPABASE_PUBLISHABLE_KEY;

let child;
let viteServer;

if (!targetUrl && dev) {
  const { createServer } = await import("vite");
  viteServer = await createServer({
    logLevel: "silent",
    server: {
      host: "127.0.0.1",
      port,
      strictPort: true,
    },
  });
  await viteServer.listen();
} else if (!targetUrl) {
  child = spawn(process.execPath, [".output/server/index.mjs"], {
      env: {
        ...runtimeEnvironment,
        HOST: "127.0.0.1",
        PORT: String(port),
        NODE_ENV: "production",
      },
      stdio: ["ignore", "pipe", "pipe"],
  });
}

let serverOutput = "";
child?.stdout.on("data", (chunk) => {
  serverOutput += chunk.toString();
});
child?.stderr.on("data", (chunk) => {
  serverOutput += chunk.toString();
});

async function request(path, expectedContent) {
  const baseUrl = targetUrl ?? `http://127.0.0.1:${port}`;
  const response = await fetch(`${baseUrl}${path}`);
  const body = await response.text();
  if (!response.ok) throw new Error(`${path} lieferte HTTP ${response.status}.`);
  if (expectedContent && !body.includes(expectedContent)) {
    throw new Error(`${path} enthält nicht den erwarteten Inhalt.`);
  }
}

async function waitForServer() {
  let lastError;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (child && child.exitCode !== null) throw new Error("Produktionsserver wurde vorzeitig beendet.");
    try {
      await request("/healthz", '"status":"ok"');
      return;
    } catch (error) {
      lastError = error;
      await wait(250);
    }
  }
  throw lastError ?? new Error("Produktionsserver wurde nicht erreichbar.");
}

async function checkSupabase() {
  const url = runtimeEnvironment.SUPABASE_URL;
  const key = runtimeEnvironment.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Für den Remote-Smoke-Test fehlt die Supabase-Konfiguration.");

  const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/settings`, {
    headers: { apikey: key },
  });
  if (!response.ok) throw new Error(`Supabase Auth lieferte HTTP ${response.status}.`);
}

try {
  await waitForServer();
  await request("/", "MeisterMe");
  await request("/auth", "MeisterMe");
  await request("/manifest.webmanifest", '"name"');
  await request("/offline.html", "MeisterMe");
  if (remote) await checkSupabase();
  console.log(
    `Smoke-Test erfolgreich${targetUrl ? ` für ${targetUrl}` : ""}${
      remote ? " (inklusive Supabase Auth)" : ""
    }.`,
  );
} catch (error) {
  const safeOutput = serverOutput
    .split(/\r?\n/)
    .filter((line) => !/(sb_publishable_|sb_secret_|AI_API_KEY|SUPABASE_SECRET_KEY)/.test(line))
    .slice(-20)
    .join("\n");
  if (safeOutput) console.error(safeOutput);
  throw error;
} finally {
  child?.kill("SIGTERM");
  await viteServer?.close();
}

if (dev) process.exit(0);
