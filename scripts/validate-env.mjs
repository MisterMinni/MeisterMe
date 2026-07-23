import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const PLACEHOLDER = /(your[_-]|change[_-]?me|example\.com|\.\.\.|<[^>]+>)/i;

export function parseDotenv(source) {
  const result = {};

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator < 1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }

  return result;
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isPresent(value) {
  return typeof value === "string" && value.trim().length > 0 && !PLACEHOLDER.test(value);
}

export function validateEnvironment(environment, profile = "core") {
  const errors = [];
  const required = [
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
  ];

  if (profile === "staging") {
    required.push("SUPABASE_SECRET_KEY", "AI_API_KEY", "AI_MODEL");
  }

  for (const name of required) {
    if (!isPresent(environment[name])) errors.push(`${name} fehlt oder enthält nur einen Platzhalter.`);
  }

  for (const name of ["VITE_SUPABASE_URL", "SUPABASE_URL"]) {
    const value = environment[name];
    if (isPresent(value) && !isHttpsUrl(value)) errors.push(`${name} muss eine gültige HTTPS-URL sein.`);
  }

  const browserUrl = environment.VITE_SUPABASE_URL;
  const serverUrl = environment.SUPABASE_URL;
  if (isPresent(browserUrl) && isPresent(serverUrl) && browserUrl !== serverUrl) {
    errors.push("VITE_SUPABASE_URL und SUPABASE_URL müssen auf dasselbe Projekt zeigen.");
  }

  const browserKey = environment.VITE_SUPABASE_PUBLISHABLE_KEY;
  const serverKey = environment.SUPABASE_PUBLISHABLE_KEY;
  for (const [name, value] of [
    ["VITE_SUPABASE_PUBLISHABLE_KEY", browserKey],
    ["SUPABASE_PUBLISHABLE_KEY", serverKey],
  ]) {
    if (isPresent(value) && !value.startsWith("sb_publishable_")) {
      errors.push(`${name} muss ein moderner Supabase Publishable Key sein.`);
    }
  }
  if (isPresent(browserKey) && isPresent(serverKey) && browserKey !== serverKey) {
    errors.push("Browser- und Server-Publishable-Key müssen identisch sein.");
  }

  const secret = environment.SUPABASE_SECRET_KEY;
  if (profile === "staging" && isPresent(secret) && !secret.startsWith("sb_secret_")) {
    errors.push("SUPABASE_SECRET_KEY muss ein moderner Supabase Secret Key sein.");
  }

  for (const name of Object.keys(environment)) {
    if (name.startsWith("VITE_") && /(SECRET|SERVICE_ROLE|AI_API_KEY|RESEND_API_KEY|WEBHOOK)/i.test(name)) {
      errors.push(`${name} würde ein Geheimnis in den Browser-Build übernehmen.`);
    }
  }

  const aiBaseUrl = environment.AI_BASE_URL;
  if (profile === "staging" && isPresent(aiBaseUrl) && !isHttpsUrl(aiBaseUrl)) {
    errors.push("AI_BASE_URL muss eine gültige HTTPS-URL sein.");
  }

  return { valid: errors.length === 0, errors };
}

function readArguments(argv) {
  const profileArg = argv.find((entry) => entry.startsWith("--profile="));
  const envFileArg = argv.find((entry) => entry.startsWith("--env-file="));
  return {
    profile: profileArg?.slice("--profile=".length) ?? "core",
    envFile: envFileArg?.slice("--env-file=".length),
  };
}

function runCli() {
  const args = readArguments(process.argv.slice(2));
  const automaticFile = existsSync(".env.local") ? ".env.local" : undefined;
  const envFile = args.envFile ?? automaticFile;
  const fileEnvironment = envFile ? parseDotenv(readFileSync(envFile, "utf8")) : {};
  const environment = { ...fileEnvironment, ...process.env };
  const profile = args.profile === "auto" ? (process.env.VERCEL ? "staging" : "core") : args.profile;

  if (profile !== "core" && profile !== "staging") {
    console.error(`Unbekanntes Prüfprofil: ${profile}`);
    process.exitCode = 2;
    return;
  }

  const result = validateEnvironment(environment, profile);
  if (!result.valid) {
    console.error(`Umgebungsprüfung (${profile}) fehlgeschlagen:`);
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Umgebungsprüfung (${profile}) erfolgreich. Es wurden keine Werte ausgegeben.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
