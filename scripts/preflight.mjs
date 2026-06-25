#!/usr/bin/env node
// Deployment preflight check for Foreman.
//
// Verifies that every environment variable the running app reads is present,
// split into build-time (inlined by Next.js) and runtime (read by the Worker).
// Run before deploying — locally against .env.local, or in CI/Cloudflare with
// the vars already in the environment.
//
//   node scripts/preflight.mjs
//
// Exits 0 when all required vars are present, 1 otherwise. Optional vars only
// produce a warning. A var is considered "set" only if it is a non-empty string.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// --- Minimal .env loader (no dependency on dotenv) -------------------------
// Loads .env.local then .env, without overriding vars already in the
// environment (mirrors Next.js precedence: real env wins).
function loadEnvFile(file) {
  let text;
  try {
    text = readFileSync(resolve(process.cwd(), file), "utf8");
  } catch {
    return; // file absent — fine
  }
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

// --- The contract ----------------------------------------------------------
// Keep this list in sync with docs/CLOUDFLARE.md and .env.example.
const BUILD_TIME = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_APP_URL",
];

const RUNTIME_REQUIRED = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "ANTHROPIC_API_KEY",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_MONTHLY",
  "STRIPE_PRICE_YEARLY",
  "CRON_SECRET",
];

// Rate limiting is disabled (with a warning) when these are unset, but the
// CLOUDFLARE.md guidance says they MUST be set in production — so warn loudly.
const RUNTIME_RECOMMENDED = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
];

const isSet = (k) =>
  typeof process.env[k] === "string" && process.env[k].trim() !== "";

function report(title, keys, { required }) {
  const missing = keys.filter((k) => !isSet(k));
  const label = required ? "required" : "recommended";
  console.log(`\n${title} (${keys.length} ${label}):`);
  for (const k of keys) {
    console.log(`  ${isSet(k) ? "✓" : required ? "✗" : "•"} ${k}`);
  }
  return missing;
}

console.log("Foreman deployment preflight");
console.log("============================");

const missingBuild = report("Build-time vars", BUILD_TIME, { required: true });
const missingRuntime = report("Runtime secrets", RUNTIME_REQUIRED, {
  required: true,
});
const missingRecommended = report(
  "Runtime (recommended)",
  RUNTIME_RECOMMENDED,
  { required: false }
);

const missing = [...missingBuild, ...missingRuntime];

console.log("\n----------------------------");
if (missingRecommended.length) {
  console.log(
    `⚠ ${missingRecommended.length} recommended var(s) unset: ${missingRecommended.join(
      ", "
    )}`
  );
  console.log("  Rate limiting is DISABLED without these. Set them in production.");
}

if (missing.length) {
  console.log(`\n✗ FAIL — ${missing.length} required var(s) missing:`);
  console.log(`  ${missing.join(", ")}`);
  console.log("\nSee docs/DEPLOY.md and docs/CLOUDFLARE.md for where each one goes.");
  process.exit(1);
}

console.log("\n✓ PASS — all required environment variables are present.");
