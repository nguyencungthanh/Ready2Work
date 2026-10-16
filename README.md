# Ready2Work

The existing Next.js / Supabase application in **`platform/`** now uses the Vietnamese Ready2Work theme and prepared assessment content from `/Users/thanhnguyen/Documents/ready2work`.

Changes are applied in place in `Personal Project/Ready2Work`. The original static landing files remain as reference material; the default commands run the authenticated application.

## Run

Use Node.js 22.12 or newer.

```sh
npm ci
npm run dev
```

Open <http://localhost:3000>. The public landing page works without backend credentials. Authenticated features need the existing Supabase project and the migrations below.

Keep the existing connection settings in `platform/.env.local`. For a new environment, copy `platform/.env.example` to that path and fill in the values. `SUPABASE_SECRET_KEY` and `GEMINI_API_KEY` are server-only settings. The old `NEXT_PUBLIC_APP_URL` setting remains supported; `NEXT_PUBLIC_SITE_URL` takes precedence.

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
- **Simulations:** 15 prepared tasks, the four supplied input datasets, private checklist grading, source-defined constraints, objective attempt timing, and atomic submission persistence.
- **Interviews:** 14 prepared sets and 88 questions. Three rounds, per-question rubric scoring, independently normalized round scores, resumable history, and immutable completed results.
- **Reports:** actual recorded progress, latest results for the target role, measured skill radar, strengths/gaps, and 30/40/30 readiness weighting. The PDF button opens a styled A4 print layout; choose **Save as PDF**.
- **Business:** business signup/onboarding, paired assignment/rubric uploads, separate simulation/interview tabs, private downloads, and publication after the existing administrator role approval.
- **Mentor:** approved mentors/admins can record a consented, evidence-based review at `/mentor`. Candidates cannot supply their own mentor score.
- **Existing base:** career discovery, learning roadmaps/chat, account settings, password recovery, and administrator role reviews remain available.

Three logistics interview sets are intentionally unavailable because their supplied first-round questions are missing. No questions were invented. The source also has no interview set for Content Marketing Specialist. Missing mentor scores, voice/body-language measurements, and hired-candidate benchmark data are explicitly shown as unavailable.

CV analysis uses the supplied Golden Profile weights and certification priorities. Without `GEMINI_API_KEY`, CV matching offers a clearly labeled keyword preview. Simulation/interview AI scoring requires a configured provider; a provider failure does not produce a fabricated score. `GEMINI_MODEL` can override the base project's model.

## Validate

```sh
npm run typecheck
npm run lint
npm test
npm run test:content
npm run test:database
npm run build
npm start
```

`npm test` runs the unit tests. `test:database` applies every migration in an isolated PostgreSQL engine and checks account/storage isolation, protected grading fields, three-round completion, atomic timed submissions, and business publication. It does not contact Supabase.

Browser tests:

```sh
npm --workspace platform run e2e -- tests/e2e/public.spec.ts
```

The remaining existing authentication/integration tests require a running local Supabase stack, email catcher and test credentials. Full email confirmation and live AI evaluation were not executed against a hosted service during this merge.

## Deploy

On Vercel, select **Next.js** and set the project's **Root Directory to `platform`**. Leave the framework's build/output defaults, and enable access to source files outside the root directory for the npm workspace. Set the environment variables from `platform/.env.example`.

Apply the additive migrations to the existing Supabase project first. Set the deployed URL as `NEXT_PUBLIC_SITE_URL` and add that URL plus `/auth/confirm` to Supabase Authentication's allowed redirect URLs. The old static project used the **Other** framework preset; change that setting for the combined application.

The root workspace also supplies a build command and Vercel configuration pointing to `platform/.next`. The `platform` project root is the recommended deployment configuration. For self-hosting, `npm run build` produces a standalone server; `npm start` loads local environment settings, copies public/static assets, and launches that server. Use `PORT` and `R2W_HOSTNAME` to choose the listener.

See [implementation, performance decisions and research](docs/IMPLEMENTATION.md) for the technical details and remaining external validation.
