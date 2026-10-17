import { readFile } from "node:fs/promises";

// npm can drop other platforms' optional bindings when recreating a lockfile
// from installed node_modules (npm/cli#4828). Vitest cannot start without one.
const { packages } = JSON.parse(await readFile(new URL("../../package-lock.json", import.meta.url), "utf8"));
const rolldown = Object.entries(packages).filter(([path]) => path.endsWith("node_modules/rolldown"));
if (!rolldown.length) throw new Error("The test runner's rolldown package is missing from package-lock.json.");

for (const [path, metadata] of rolldown) {
  for (const [name, version] of Object.entries(metadata.optionalDependencies ?? {})) {
    if (!name.startsWith("@rolldown/binding-")) continue;
    let directory = path;
    let binding;
    while (true) {
      binding = packages[`${directory ? `${directory}/` : ""}node_modules/${name}`];
      if (binding || !directory) break;
      const index = directory.lastIndexOf("node_modules/");
      directory = index < 0 ? "" : directory.slice(0, index).replace(/\/$/, "");
    }
    if (!binding || binding.version !== version || !binding.optional) {
      throw new Error(`Incomplete cross-platform test lockfile: ${name}@${version}. Restore the optional binding before running npm ci.`);
    }
  }
}
console.log("Test runner bindings are locked for every supported platform.");
