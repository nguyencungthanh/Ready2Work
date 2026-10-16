import { access, cp } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import nextEnv from "@next/env";

const root = fileURLToPath(new URL("../", import.meta.url));
nextEnv.loadEnvConfig(root, false);
const candidates = [".next/standalone/platform/server.js", ".next/standalone/server.js"];
let server;
for (const candidate of candidates) {
  const target = path.join(root, candidate);
  try { await access(target); server = target; break; } catch { /* Try the standalone layout for the other project root. */ }
}
if (!server) throw new Error("Production build missing. Run npm run build first.");
const directory = path.dirname(server);
await cp(path.join(root, "public"), path.join(directory, "public"), { recursive: true });
await cp(path.join(root, ".next/static"), path.join(directory, ".next/static"), { recursive: true });
const argument = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const port = argument("--port") ?? process.env.PORT ?? "3000";
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error("Invalid server port.");
const child = spawn(process.execPath, [server], {
  cwd: root, stdio: "inherit",
  env: { ...process.env, NODE_ENV: "production", PORT: port, HOSTNAME: argument("--hostname") ?? process.env.R2W_HOSTNAME ?? "0.0.0.0" },
});
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => { process.exitCode = code ?? 0; });
child.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
