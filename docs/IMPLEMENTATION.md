# Architecture and implementation notes

Current scope: [Master Plan 2.3](../career_platform_ai_agent_master_plan.md). Requirements: [Ready2Work.pdf](requirements/Ready2Work.pdf). UI baseline and cleanup: [current interface](UI-REFERENCE.md).

## Foundation and ownership

The existing Next.js 16.4.2, React 19.2.4 and Supabase SSR foundation was retained. The base project's password authentication, email verification, reset flow, database identities and DB-backed roles were preserved. Auth routing was extended for business onboarding; return URLs are restricted to paths inside the application.

The application in `platform/` is updated in place. Its current interface is the sole design baseline. Previous static UI code and old-render comparison materials have been removed; prototype localStorage demo accounts were never imported as real identities or history.

## Content and scoring

`platform/data/` contains the supplied Golden Profiles, task rubrics, interview question bank and actual task inputs. `platform/scripts/import-content.mjs` validates their relationships and generates an additive SQL migration with stable IDs. It rejects broken weights/checklists, preserves source question maxima, and removes worked solutions from public task data.

Applied migrations are immutable. The current owner instruction permits only supplied Google Docs content; the earlier Marketing supplement has been removed. `scripts/sync-requirements.py` uses the canonical document snapshot and original-material manifest. The current generation target is `20261017000300_document_only_catalog.sql`: update the fifteen source tasks, remove unsupported inputs from current database reference data, archive known legacy demos and supersede open attempts using earlier materials. It leaves recorded answers and real company content intact. Later content changes require a new migration rather than editing a published one.

The source snapshot, rechecked live on 18 October, contains 15 Golden Profiles, 15 simulations and 15 interview sets with 120 questions. Every industry has three positions; every position has three interview rounds of 3/3/2 questions. Original Google Docs paragraphs, table cells, hyperlinks and the nested IT Data Analyst input/benchmark tables are retained in `data/source/requirements-20261017.json`. Contracts compare question wording and profile requirements to exact source cells. The public IT table preserves all five original columns; the benchmark table stays private.

New CV analyses preserve the source requirement levels and their industry-specific meaning. Marketing M3 means advantage; other industries use M3 conditionally and M4 as advantage. Conditional/advantage items are not mandatory gaps. Numeric CV weights are awaiting the owner's table, so new analyses have a null percentage and qualitative findings; historical results retain their recorded scores. Validated image PDFs with no usable text layer are sent inline to Gemini for OCR after consent. The CV is not logged or committed.

Simulation grading v2 preserves authored point components, including fractional awards. AI returns bounded item awards with an exact submission quote and a separate reason; the server validates IDs, evidence and maxima and calculates the total. It does not apply legacy quarter bands, invented penalties, word caps or a hybrid timing cap. Twenty original input images retain their SHA-256 checksums; their actual verified bytes are sent inline to Gemini when needed, rather than only sending file paths. Images are traced into the simulation function. Answer-key and feedback/CV images are excluded. The source version, document-only policy and content revision must all match before grading a current source task.

Three Marketing simulations lack the original product brief, advertising/landing-page inputs or twelve-keyword table; no replacements are fabricated. Three banking simulations await rubric clarification. Seven interview sets have source point conflicts; the tax interview also has apparent question/criterion paste errors. All fifteen source tasks/sets remain reviewable, with drafts available for closed simulations; nine simulations and seven interviews are open for grading. Old questions/answers and score snapshots remain intact. Source-only catalog/recommendation filtering does not change the established Report/readiness history aggregation. Real company assignments retain their own approved publication and grading path.

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

See [validation records](VALIDATION.md). Earlier UI/auth checks passed on local Supabase; they are historical evidence and do not claim a hosted deployment or new live AI evaluation. Deployment and report work are recorded in the validation log; historical UI checks are not claimed as new acceptance.

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

## Direct report export

`/api/report/pdf` selects the owner from the verified active session and reuses `getCandidateOverview`, including the same 30/40/30 readiness policy. It returns a private, non-cacheable PDF attachment. The renderer and bundled, OFL-licensed Noto Sans fonts run on the server; no candidate data is sent to a PDF service. A4 layout includes a gauge, measured radar, actual task results, strengths/gaps and page numbers. Feedback is split into bounded cards to preserve long text across pages. The download button exposes loading/error states.

Recommendations now prefer the CV target before related industries, exclude graded tasks and closed content, and work without a prior submission. Deployment configuration selects Singapore (`sin1`) to be near the existing Supabase database; no latency guarantee is claimed.
