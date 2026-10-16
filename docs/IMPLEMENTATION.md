# Architecture and implementation notes

Current scope: [Master Plan 2.0](../career_platform_ai_agent_master_plan.md). Requirements: [Ready2Work.pdf](requirements/Ready2Work.pdf). UI baseline and cleanup: [current interface](UI-REFERENCE.md).

## Foundation and ownership

The existing Next.js 16.2.12, React 19.2.4 and Supabase SSR foundation was retained. The base project's password authentication, email verification, reset flow, database identities and DB-backed roles were preserved. Auth routing was extended for business onboarding; return URLs are restricted to paths inside the application.

The application in `platform/` is updated in place. Its current interface is the sole design baseline. Previous static UI code and old-render comparison materials have been removed; prototype localStorage demo accounts were never imported as real identities or history.

## Content and scoring

`platform/data/` contains the supplied Golden Profiles, task rubrics, interview question bank and actual task inputs. `platform/scripts/import-content.mjs` validates their relationships and generates an additive SQL migration with stable IDs. It rejects broken weights/checklists, preserves source question maxima, and removes worked solutions from public task data.

The catalog contains 15 simulations, 14 interview sets and 88 questions. Eleven interview sets are complete. The three logistics sets have no source round 1 and remain closed. Marketing interview rounds have different source maxima; each round is independently normalized to 100. Content Marketing has a simulation/Golden Profile but no supplied interview set.

The source has 119 simulation checklist items. AI returns validated evidence/status for each required item; server code computes points, applies the supplied hard constraints and replaces timing claims with elapsed time from an account-owned database attempt. The existing theme's 75% cap for an overdue hybrid time/content item is retained because its source does not give a separate point split. Submission finalization is transactional and replay-safe.

CV scoring uses the source guideline: hard skills/tools have their recorded weights, certificates use the provided priority mapping, and unweighted soft skills are qualitative findings. Evidence for a matched/partial AI finding must occur verbatim in the uploaded text. The keyword preview is labeled as such and does not claim that an absent CV keyword proves an absent skill.

Reports use the latest recorded result per task/set and the same target role across CV, simulation, interview and mentor evidence. The simulation component is the percentage of target-role library tasks completed; this interpretation is displayed alongside the 30/40/30 formula. Missing inputs leave the official readiness score incomplete. A mentor score comes from an approved mentor/admin's recorded assessment, not a candidate field. Radar axes use measured criterion evidence; the app does not invent voice metrics or a hired-candidate comparison cohort.

## Persistence and permissions

- The existing SSR session cookies and database roles remain the authorization boundary.
- New CV and business files use private Supabase Storage buckets, user-prefixed paths and short-lived owner-scoped download URLs.
- Candidate activity reads use row-level security. Graded writes go through validated server actions and the server-only Supabase client.
- Column grants prevent direct reads of private answer keys and direct writes to scores or account status.
- Interview triggers verify question membership, serialize answer writes/completion, recalculate round totals and freeze completed evaluations.
- Business uploads retain each assignment and its own rubric in the same record. Publication locks that record, checks approved DB roles, and creates the catalog/questions in one transaction.
- Company email is collected and verified through the existing email-auth flow. Automated company/domain ownership verification is not claimed; the existing administrator approval determines publishing access.

## Performance choices

The public landing page is statically generated and does not verify a session on every visit. Private pages are separate server-rendered routes. Feature datasets and scoring libraries stay server-side; PDF/DOCX parsers are imported only for document processing. Original images use Next.js image sizing and modern output formats, and the theme has no external font request or landing-page animation observer dependency.

Independent Supabase queries run in parallel. Request-local React memoization avoids repeating identity/report work in the same render, without caching one user's results for another. Composite indexes and security-invoker latest-result views bound report history transport to the number of tasks/sets rather than every past attempt. Recent activities are limited to five entries. Static assets are fingerprinted by Next.js; private pages and downloads do not receive public cache headers.

The project uses Turbopack for normal builds and standalone tracing for self-hosting. A clean workspace install, a root production build and the standalone launcher were exercised. The sandbox's process restrictions initially stalled Turbopack; the normal build passed when allowed its required process permissions. A webpack production build also passed. No production traffic/load benchmark was performed, so capacity and latency guarantees are not claimed.

## Validation and external checks

See [validation records](VALIDATION.md). Earlier UI/auth checks passed on local Supabase; they are historical evidence and do not claim a hosted deployment or new live AI evaluation. The latest cleanup uses import/asset reference checks and one production build, without rerunning unrelated browser, database or provider suites.

Use the scope-based verification policy in Master Plan §9. No hosted migration or Vercel deployment is performed as part of a documentation/UI cleanup change.

## Research used

The implementation follows the existing foundation and official examples; it does not copy an unrelated application's UI or backend.

- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components): keep presentation/data on the server and narrowly scope browser interactivity.
- [Next.js production checklist](https://nextjs.org/docs/app/guides/production-checklist): static output, image optimization and deferred feature libraries.
- [Supabase Next.js SSR example](https://github.com/supabase/supabase/tree/master/examples/user-management/nextjs-user-management): cookie-aware server/client boundaries.
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security) and [RLS performance guidance](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv): ownership policies, cached auth expressions and indexes.
- [unpdf](https://github.com/unjs/unpdf) and [Mammoth](https://github.com/mwilliamson/mammoth.js): server-side text extraction, loaded only when required.
- [Vercel monorepos](https://vercel.com/docs/monorepos): deploy the application with `platform` as its project root.
- [Supabase migration CLI](https://supabase.com/docs/reference/cli/supabase-migration-up): apply pending migrations rather than resetting an existing database.

CI installs from the root workspace lockfile. Its fast job runs unit/content/isolated-database checks and public browser tests; a separate job starts local Supabase, derives real local test keys, and runs the identity/email-auth suites. Existing live-AI feature E2E tests require a provider configuration and are not presented as offline validation.
