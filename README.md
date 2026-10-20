# Ready2Work

The Next.js / Supabase application in **`platform/`** is the only active application and UI. The previous root HTML/CSS/JS landing, unused landing components/assets and old-render comparison folders have been removed.

Product requirements: [Ready2Work.pdf](docs/requirements/Ready2Work.pdf). Scope and future work: [Master Plan 2.1](career_platform_ai_agent_master_plan.md). The current UI is the design baseline; new features in the plan are not implemented merely by updating the plan. Existing authentication, backend and stored accounts/history are retained.

## Run

Use Node.js 22.13 or newer (Vercel uses Node.js 24).

```sh
npm ci
npm run dev
```

Run installation commands from the repository root. The root `package-lock.json` is the only lockfile for this npm workspace; do not maintain a separate one in `platform/`.

Local build and test output (`platform/.next/`, `platform/test-results/`, `*.tsbuildinfo` and `platform/next-env.d.ts`) is generated and excluded from Git. `npm run dev` recreates development output; run `npm run build` before using `npm start` after a cleanup.

Open <http://localhost:3000>. The public landing page works without backend credentials. Authenticated features need the existing Supabase project and the migrations below.

Keep the existing connection settings in `platform/.env.local`. For a new environment, copy `platform/.env.example` to that path and fill in the values. `SUPABASE_SECRET_KEY`, `GEMINI_API_KEY` and `AI_API_KEY` are server-only settings. The old `NEXT_PUBLIC_APP_URL` setting remains supported; `NEXT_PUBLIC_SITE_URL` takes precedence.

## Database setup

Use the **same Supabase project** as the working base to retain its accounts and history. Do not create a replacement project just to apply the theme.

For an existing local Supabase stack, run these commands from `platform/`:

```sh
npx supabase start
npx supabase migration up --local
```

For an existing hosted project, link to that project, inspect the pending changes, and apply the migrations from `platform/`:

```sh
npx supabase link --project-ref YOUR_EXISTING_PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
```

The three new migrations begin with `20261016`. They add the CV/business/mentor data, import prepared content, and add timed submissions and bounded report views. They do not delete existing accounts or recorded submissions. Apply the full migration history only to a fresh database; an existing base should already have the earlier migrations recorded.

## Implemented journeys

- **Candidate:** email signup/verification/sign-in → CV upload or pasted CV → position-specific Golden Profile analysis → relevant simulation/interview → saved results → dashboard and report.
- **Simulations:** 15 available tasks, four original input datasets and three authorized Marketing datasets, private checklist grading, source-defined constraints, objective attempt timing, and atomic submission persistence.
- **Interviews:** 15 source sets and 120 questions, all open for grading. Three rounds, per-question rubric scoring, independently normalized round scores, resumable history, and immutable completed results.
- **Reports:** actual recorded progress, latest results for the target role, measured skill radar, strengths/gaps, and 30/40/30 readiness weighting. The PDF button opens a styled A4 print layout; choose **Save as PDF**.
- **Business:** business signup/onboarding, paired assignment/rubric uploads, separate simulation/interview tabs, private downloads, and publication after the existing administrator role approval.
- **Mentor:** approved mentors/admins can record a consented, evidence-based review at `/mentor`. Candidates cannot supply their own mentor score.
- **Existing base:** career discovery, learning roadmaps/chat, account settings, password recovery, and administrator role reviews remain available.

The interview library contains all 15 source positions and 120 questions, with all three rounds open for grading. The 19 October five-tab refresh completes the eight previously pending sets and updates one auditing criterion. New set/question IDs preserve historical sessions and grades; a reviewed normalization retains the BA question weight 30 alongside its raw 35-point rubric. Missing mentor scores, voice/body-language measurements, and hired-candidate benchmark data are explicitly shown as unavailable.

CV analysis uses the supplied Golden Profile weights and certification priorities. Without a configured AI key, CV matching offers a clearly labeled keyword preview. Simulation/interview AI scoring requires a configured provider; a provider failure does not produce a fabricated score. `GEMINI_MODEL` selects the direct Google model. For Vilao, set `AI_BASE_URL=https://api.vilao.ai/v1` and `AI_MODEL=sba/ag/gemini-3.8-flash` in the `ready2-work` Vercel project, then redeploy. Set the purchased key in server-only `AI_API_KEY`, or retain it in the existing `GEMINI_API_KEY` variable. A configured gateway uses Responses for text requests. Vilao document/image requests use its chat/completions endpoint with ordered page images rendered locally; failures do not fall back to Google. The interface uses the R2W AI assistant identity. CV consent explains the integrated AI processing and full-page PDF OCR without exposing provider branding.

CV file uploads accept **PDF only**, up to 3 MiB and 15 pages. File-picker and drag-and-drop checks are repeated on the server, which verifies the PDF structure and rejects encrypted or broken documents. PDFs with images, unreadable text layers, or local parser failures are recognized across all pages by the configured AI provider after consent; readable text-only PDFs stay local for extraction. Pasted CV text remains available. OCR has a dedicated 45-second request timeout, and CV Server Actions have a 180-second execution budget. Temporary provider HTTP 503 responses are retried once; quota failures are not retried; invalid analysis output shares a single corrective retry budget. Failures are never replaced with invented results. No new analysis is saved after an extraction or analysis failure.

## Validate only what changed

Do not run every suite after each small change. Follow the change-based policy in [Master Plan §9](career_platform_ai_agent_master_plan.md#9-kiểm-tra-vừa-đủ-có-điểm-dừng).

- Documentation only: check content and links; no application tests.
- Removing unused UI/assets: verify references and run `npm run build` once (includes TypeScript).
- UI interaction: run the affected browser scenario, without re-running unrelated signup/reset/AI flows.
- Scoring or rubric changes: run the relevant unit/content tests.
- Auth, RLS or migrations: run the affected auth/database/integration checks.
- Release: one focused candidate/business smoke pass on the final deployment environment.

Available checks remain `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:content`, `npm run test:database` and targeted Playwright tests. Use them when relevant, not as an obligatory sequence. Existing browser/integration suites require local Supabase and Mailpit; live AI acceptance is a separate check and must not be claimed from fixture rendering.

## Deploy

On Vercel, select **Next.js** and set the project's **Root Directory to `platform`**. Leave the framework's build/output defaults, and enable access to source files outside the root directory for the npm workspace. Set the environment variables from `platform/.env.example`.

Apply the additive migrations to the existing Supabase project first. Set the deployed URL as `NEXT_PUBLIC_SITE_URL` and add that URL plus `/auth/confirm` to Supabase Authentication's allowed redirect URLs. The old static project used the **Other** framework preset; change that setting for the combined application.

The production Vercel project is `ready2-work`, with Root Directory set to `platform`. Keep the Next.js output-directory default; an explicit `platform/.next` override would resolve to `platform/platform/.next` when deploying from the workspace root. For self-hosting, `npm run build` produces a standalone server; `npm start` loads local environment settings, copies public/static assets, and launches that server. Use `PORT` and `R2W_HOSTNAME` to choose the listener.

See [implementation, performance decisions and research](docs/IMPLEMENTATION.md) for the technical details and remaining external validation.

Report PDF downloads are generated privately on the server at `/api/report/pdf`, using the same recorded data as `/report`. Vietnamese fonts are bundled; no external PDF service is used. The active deployment is https://ready-2work.vercel.app; see [deployment status](docs/DEPLOYMENT.md).
