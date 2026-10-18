// Explicit deployment preflight. Never print credentials, user data or raw
// provider errors. Ordinary local/CI builds do not perform network requests.
if (process.argv.includes("--if-enabled") && process.env.R2W_VERIFY_HOSTING !== "1") process.exit(0);

const { createClient } = await import("@supabase/supabase-js");
const report = (check, fields) => console.info(JSON.stringify({ check, ...fields }));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !publishable || !secret) {
  report("hosting-config", { ok: false, reason: "missing-supabase-config" });
  process.exit(1);
}
if (new URL(url).hostname !== "pzuhokmwlgobqhwottpa.supabase.co"
  || process.env.NEXT_PUBLIC_SITE_URL !== "https://ready-2work.vercel.app") {
  report("hosting-config", { ok: false, reason: "unexpected-production-project-or-site" });
  process.exit(1);
}
const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const checks = await Promise.all([
  fetch(`${url}/auth/v1/settings`, { headers: { apikey: publishable }, signal: AbortSignal.timeout(15_000) })
    .then((response) => ({ check: "hosting-auth", ok: response.ok, status: response.status }))
    .catch(() => ({ check: "hosting-auth", ok: false })),
  admin.from("cv_analyses").select("id").limit(0)
    .then(({ error, status }) => ({ check: "hosting-cv-database", ok: !error, status })),
  admin.storage.getBucket("candidate-cvs")
    .then(({ data, error }) => ({ check: "hosting-cv-storage", ok: !error && data?.public === false && data?.file_size_limit === 3_145_728 })),
]);
for (const { check, ...fields } of checks) report(check, fields);
if (checks.some((check) => !check.ok)) process.exit(1);

// The provider is checked through the application adapter, using synthetic data.
if (process.env.R2W_CHECK_AI === "1") {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync("npm", ["exec", "--", "vitest", "run", "tests/integration/ai/live-provider.test.ts"], {
    stdio: "inherit", env: { ...process.env, R2W_RUN_LIVE_AI: "1" },
  });
  report("hosting-ai-provider", { ok: result.status === 0 });
  if (result.status !== 0) process.exit(1);
}

if (process.env.R2W_CHECK_CV === "1") {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync("npm", ["exec", "--", "vitest", "run", "tests/integration/cv/live-pdf.test.ts", "-t", "analyzes synthetic recognized|reads and analyzes"], {
    stdio: "inherit", env: { ...process.env, R2W_RUN_LIVE_CV: "1" },
  });
  report("hosting-cv-provider", { ok: result.status === 0 });
  if (result.status !== 0) process.exit(1);
}
