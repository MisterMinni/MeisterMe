import assert from "node:assert/strict";
import test from "node:test";

import { parseDotenv, validateEnvironment } from "../scripts/validate-env.mjs";

const core = {
  VITE_SUPABASE_URL: "https://project.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_browser_key_123456",
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_browser_key_123456",
};

test("parst einfache Dotenv-Dateien ohne Kommentare", () => {
  assert.deepEqual(parseDotenv("# comment\nFOO=bar\nQUOTED=\"value\"\n"), {
    FOO: "bar",
    QUOTED: "value",
  });
});

test("akzeptiert eine vollständige Core-Konfiguration", () => {
  assert.deepEqual(validateEnvironment(core, "core"), { valid: true, errors: [] });
});

test("verlangt im Staging serverseitige Admin- und KI-Schlüssel", () => {
  const result = validateEnvironment(core, "staging");
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /SUPABASE_SECRET_KEY/);
  assert.match(result.errors.join("\n"), /AI_API_KEY/);
  assert.match(result.errors.join("\n"), /AI_MODEL/);
});

test("erkennt unterschiedliche Supabase-Projekte", () => {
  const result = validateEnvironment(
    { ...core, SUPABASE_URL: "https://other.supabase.co" },
    "core",
  );
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /dasselbe Projekt/);
});

test("blockiert Geheimnisse mit VITE-Präfix", () => {
  const result = validateEnvironment(
    { ...core, VITE_SUPABASE_SECRET_KEY: "sb_secret_do_not_expose" },
    "core",
  );
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /Browser-Build/);
});

test("akzeptiert eine vollständige Staging-Konfiguration", () => {
  const result = validateEnvironment(
    {
      ...core,
      SUPABASE_SECRET_KEY: "sb_secret_server_key_123456",
      AI_API_KEY: "provider-key-123456",
      AI_MODEL: "model-name",
      AI_BASE_URL: "https://api.openai.com/v1",
    },
    "staging",
  );
  assert.deepEqual(result, { valid: true, errors: [] });
});
