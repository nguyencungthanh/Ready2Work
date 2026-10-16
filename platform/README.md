# Ready2Work application

This is the combined Next.js/Supabase application. Start from the repository [setup guide](../README.md) and [implementation notes](../docs/IMPLEMENTATION.md).

From this directory, `npm run dev`, `npm run build`, `npm start`, `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:content` and `npm run test:database` operate on the app directly.

Use the existing Supabase project to retain working accounts. Apply the three `20261016` additive migrations before using the new CV, business, interview and report features. Configuration is documented in `.env.example`; never commit `.env.local`.
