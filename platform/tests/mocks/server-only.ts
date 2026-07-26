// No-op stand-in for the "server-only" package during tests. The real
// package throws when imported outside Next.js's bundler; that guard has no
// meaning in a Vitest run, so we alias it away (see vitest.config.ts).
export {};
