import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const text = await readFile(process.argv[2], "utf8");
const values = Object.fromEntries(text.split(/\r?\n/).filter((line) => /^[A-Z_]+=/.test(line)).map((line) => {
  const index = line.indexOf("=");
  return [line.slice(0, index), line.slice(index + 1).replace(/^"|"$/g, "")];
}));
const url = values.API_URL || values.SUPABASE_URL;
const key = values.PUBLISHABLE_KEY || values.ANON_KEY;
const secret = values.SECRET_KEY || values.SERVICE_ROLE_KEY;
if (!url || !key || !secret || !["localhost", "127.0.0.1"].includes(new URL(url).hostname)) {
  throw new Error("Integration tests require the local Supabase URL and test keys.");
}
const env = {
  NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
  SUPABASE_SECRET_KEY: secret, NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
};
await writeFile(fileURLToPath(new URL("../.env.local", import.meta.url)),
  Object.entries(env).map(([name, value]) => `${name}=${value}`).join("\n") + "\n");
