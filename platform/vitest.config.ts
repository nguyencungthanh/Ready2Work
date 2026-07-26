import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => ({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    // Integration tests talk to the local Supabase stack, so they need
    // .env.local. Unit tests ignore these values.
    env: loadEnv(mode, process.cwd(), ""),
    alias: {
      // "server-only" throws outside Next.js's bundler; it has no effect in
      // tests since the whole point (blocking client bundling) doesn't apply.
      "server-only": require.resolve("./tests/mocks/server-only.ts"),
    },
  },
}));
