# Architecture and implementation notes

Current scope: [Master Plan 2.3](../career_platform_ai_agent_master_plan.md). Requirements: [Ready2Work.pdf](requirements/Ready2Work.pdf). UI baseline and cleanup: [current interface](UI-REFERENCE.md).

## Foundation and ownership

The existing Next.js 16.4.2, React 19.2.4 and Supabase SSR foundation was retained. The base project's password authentication, email verification, reset flow, database identities and DB-backed roles were preserved. Auth routing was extended for business onboarding; return URLs are restricted to paths inside the application.

Auth redirects retain refreshed/cleared cookies and Supabase's cache headers. Sign-in requires a stored usable profile; missing data is not treated as an active account. Deleted/suspended sessions cannot loop through the sign-in redirect, and password updates require a usable authenticated account. PKCE callbacks distinguish missing browser context from provider availability and expired/used links; only safe error categories are logged.

The application in `platform/` is updated in place. Its current interface is the sole design baseline. Previous static UI code and old-render comparison materials have been removed; prototype localStorage demo accounts were never imported as real identities or history.

The dashboard R2W AI card calls the authenticated `/api/assistant` endpoint with the existing server-only Gemini configuration. Its context covers the four current candidate features and the submitted conversation; it does not automatically load a CV, profile or score. Conversation state stays on the current page. Requests and replies are bounded, private responses are not cached, and provider errors leave the question available for retry.

## Content and scoring

`platform/data/` contains the supplied Golden Profiles, task rubrics, interview question bank and actual task inputs. `platform/scripts/import-content.mjs` validates their relationships and generates an additive SQL migration with stable IDs. It rejects broken weights/checklists, preserves source question maxima, and removes worked solutions from public task data.

Applied migrations are immutable. The 19 October refresh captures all fifteen simulation assignments in `data/source/simulations-20261019.json`; the original Golden Profile/interview snapshot is retained. The owner authorized filling missing exercise data and correcting inconsistent points. Three labeled Marketing input sets are in `source/marketing-inputs-20261019.json`; the Financial Analyst correction (three 10-point solutions) is recorded in `source/simulation-adjustments-20261019.json`. `scripts/sync-requirements.py` applies these reviewed inputs through `simulation_refresh.py`. The generation target is the additive `20261019000100_simulation_source_refresh.sql`, updating only seven changed tasks and superseding their open attempts when the content revision differs. Completed submissions, unchanged attempts, company content and interviews are retained.

The source snapshot, rechecked live on 18 October, contains 15 Golden Profiles, 15 simulations and 15 interview sets with 120 questions. Every industry has three positions; every position has three interview rounds of 3/3/2 questions. Original Google Docs paragraphs, table cells, hyperlinks and the nested IT Data Analyst input/benchmark tables are retained in `data/source/requirements-20261017.json`. Contracts compare question wording and profile requirements to exact source cells. The public IT table preserves all five original columns; the benchmark table stays private.

New CV analyses preserve the source requirement levels and their industry-specific meaning. Marketing M3 means advantage; other industries use M3 conditionally and M4 as advantage. Conditional/advantage items are not mandatory gaps. Numeric CV weights are awaiting the owner's table, so new analyses have a null percentage and qualitative findings; historical results retain their recorded scores. Validated image PDFs with no usable text layer are sent inline to Gemini for OCR after consent. The CV is not logged or committed.

Simulation grading v2 preserves authored point components, including fractional awards. AI returns bounded item awards with an exact submission quote and a separate reason; the server validates IDs, evidence and maxima and calculates the total. It does not apply legacy quarter bands, invented penalties, word caps or a hybrid timing cap. Twenty original input images retain their SHA-256 checksums; their actual verified bytes are sent inline to Gemini when needed, rather than only sending file paths. Images are traced into the simulation function. Answer-key and feedback/CV images are excluded. The source version, policy and content revision must match the current task individually before grading; authorized supplements have their own explicit policy.

All fifteen simulations are open for grading after the refreshed banking rubrics and authorized Marketing inputs. Each task has a 100-point rubric; the full library has 115 checklist items. Financial Analyst requires five causes and five evidenced findings; its third task awards ten points for each of three solutions. Marketing datasets preserve the original aggregate ad metrics, supply the Product Brief/landing-page facts and provide twelve labeled synthetic SEO candidates. Every one of the twenty linked original source images was downloaded again and its SHA-256 matched. The subsequent interview refresh below completes all fifteen sets after reviewing the five source tabs. Recorded answers and score snapshots are unchanged.

Reports use the latest recorded result per task/set and the same target role across CV, simulation, interview and mentor evidence. The simulation component is the percentage of target-role library tasks completed; this interpretation is displayed alongside the 30/40/30 formula. Missing inputs leave the official readiness score incomplete. A mentor score comes from an approved mentor/admin's recorded assessment, not a candidate field. Radar axes use measured criterion evidence; the app does not invent voice metrics or a hired-candidate comparison cohort.

## Persistence and permissions

- The existing SSR session cookies and database roles remain the authorization boundary.
- Candidate onboarding collects the current province/city alongside university information and saves it to the existing `profiles.city` column and onboarding preferences. The user-scoped draft retains the value until completion; business onboarding does not overwrite it. No schema migration is required.
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

## Response latency — 19/10/2026

- Dashboard chat negotiates NDJSON with the API. Vilao uses incremental SSE upstream; other providers retain the validated full-reply adapter. JSON clients remain compatible. Partial replies stay outside completed history; interruption preserves the user's question for retry. Upstream generation is cancelled when a streaming client disconnects, and output limits still apply.
- Roadmap coaching fetches only the latest ten messages and sends at most five complete exchanges plus the current question, within 16,000 history characters and a 1,200-token reply limit. Stored history is retained. Timestamp ties are ordered by role to keep saved user/assistant pairs intact.
- Independent dashboard/profile and roadmap/career reads run concurrently. Interview submission reads set availability and identity through the session relation, removing a duplicate request while preserving authorization and rubric checks.
- Source grading omits only context/requirements already present verbatim in the prompt. Private reference data, image bytes, all checklist rules, evidence validation and the retry budget remain intact. PDF rendering modules load only when PDF attachments need them.
- CV logs include separate read, analysis, upload and save durations without CV text or personal identifiers. Chat logs distinguish first-text and complete-reply durations. Streaming improves time to visible text; provider generation and scanned-PDF recognition still contribute to total completion time.
- Verification: unit checks plus isolated Chromium streaming/interruption/retry coverage. The explicit `R2W_CHECK_ASSISTANT=1` hosting preflight exercises synthetic full and streamed conversations and prints provider timing metadata only. A single short hosted sample observed 946ms to first streamed text and 957ms to completion; these exclude browser/auth latency and are not a service-level guarantee or a before/after benchmark.

## Practice deadline and interview deletion — 19/10/2026

- Every simulation attempt and complete three-round interview session has one fixed 60-minute wall-clock window. This runtime policy overrides older source duration estimates without rewriting source snapshots or historical scores. Reloading, leaving the page or changing questions does not reset the start timestamp.
- Both forms count down to zero and stop their timer. At expiry the simulation editor, tables and upload are locked; interview text, speech recognition and question playback stop. Drafts remain available locally. Expired sessions are shown as ended, and starting again creates a new attempt/session rather than resuming the expired one.
- Server actions reject late submissions before calling AI. Database triggers enforce the same exclusive deadline and immutable starts. A trusted server receipt timestamp before the deadline allows an in-flight AI evaluation to finish afterward; it does not reopen editing or extend the window. Report aggregation may finish after expiry when every question was already submitted; its completion timestamp is capped at the deadline. Incomplete sessions receive no invented overall score.
- Owners can delete individual interview sessions from recent history or dashboard activity. RLS and an explicit owner filter protect deletion; answers cascade, progress/report routes refresh, and local drafts for that session are removed in the deleting tab. No histories are automatically deleted. The recent-history header no longer links “Xem chi tiết” to the dashboard.
- Additive migration: `20261019000200_practice_deadlines_and_interview_deletion.sql`. Existing grades are preserved; old answer receipt timestamps remain null. Isolated database checks cover exact deadline rejection, valid in-flight results, start-time immutability, owner-only deletion, answer cascade and writes after deletion. Chromium checks exercise both deadline locks, microphone stop, persistent expired drafts and the delete control.

## Completed interview source — 19/10/2026

- The public Google Docs HTML export was read with `include_tabs_content=true`. `data/source/interviews-20261019.json` captures all 120 questions and source criteria from the five tabs, with an export SHA-256 and exact table/row locations. Feedback, CVs and simulation data are excluded from this snapshot.
- `scripts/interview_refresh.py` overlays the immutable 17 October baseline. It completes BA, Accountant, Tax Assistant, Credit Analyst, Financial Analyst, Logistics Operations, Supply Chain and Purchasing; it also captures the revised Auditing R2 Q3 criterion. Six unchanged sets keep their existing IDs. Nine revised sets get new versioned IDs and 72 new question rows; no historical question, session, answer or grade is overwritten.
- Source points now resolve the old blockers, including the accountant's explicit `(12d)` and the corrected tax prompts. BA R2 Q2 remains nominally 30 with raw criteria 15/12/8. The reviewed rule in `source/interview-adjustments-20261019.json` keeps both: criterion ratio normalizes to 100, then the source question weight 30 applies within its round. The importer accepts only the explicit reviewed normalization; other mismatches still fail validation.
- All 15 sets have three rounds of 3/3/2 questions. Every round's question weights sum to 100. Criterion validation covers all 120 questions, exact IDs, maxima and normalized scores. Existing 60-minute session deadlines and owner-only deletion remain in force.
- `20261019000300_interview_source_refresh.sql` archives only the nine replaced set versions and inserts their new sets/questions. Replays use `do nothing`, and isolated database checks preserve every old question/session/answer, complete all nine revised interviews one by one, compare all 120 current prompts/reference rubrics and verify replay stability.
- Opt-in `R2W_CHECK_INTERVIEW_REFRESH=1` runs nine sequential source checks and one unrelated-answer check with synthetic text, no account creation or database writes, stopping on the first failure. Coverage includes the eight previously blocked sets plus the updated Auditing criterion, the BA normalization, accounting points, revised tax question and four-criterion banking questions. `R2W_INTERVIEW_REFRESH_CASE=negative` reruns only the unrelated-answer case after the nine source cases have passed.
- Interview grading accepts at most two calls in total, including one corrective retry for invalid JSON/schema, incorrect IDs, excess points, timeouts or HTTP 503. HTTP 401/429 remain failures without retry or invented scores. Invalid provider output is never copied into the corrective prompt.
