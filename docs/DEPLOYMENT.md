# Deployment status — 17/10/2026

## Confirmed

- Feedback application baseline: `161edad`, deployment `dpl_H3p9wb8tRrMiDA5DgNaxGtdmv7Xw`, Ready. The documentation follow-up `eb67519` is also Ready. Both confirm the canonical alias `ready-2work.vercel.app` and functions in `sin1`.
- After publication, `/`, `/signup`, `/signin`, `/api/health` and an original input image returned HTTP 200. The input image matches the repository SHA-256; private answer-key image `14.png` returns 404. These public checks do not assert end-to-end email delivery or provider availability.
- GitHub: `nguyencungthanh/Ready2Work`, branch `main`.
- Vercel project: `ready2work-platform`, root directory `platform`, Next.js preset.
- Production URL: https://ready-2work.vercel.app
- The user preferred the original domain. It was moved from `ready2-work` to the configured `ready2work-platform` project without deleting either project. Vercel `NEXT_PUBLIC_SITE_URL` and Supabase Site URL now use `https://ready-2work.vercel.app`; its confirmation and recovery redirects are allowed. The previous smoky domain remains an alias.
- Commit `adf3474` built successfully on Vercel Linux. The lockfile now includes the Linux x64 GNU optional bindings for Lightning CSS, Tailwind Oxide and the resolver; installation uses `npm ci --include=optional`.
- Production `/`, `/signup` and `/api/health` returned HTTP 200. The signup page contains the current UI. The health endpoint does not validate database connectivity.
- Supabase project `ready2work-production` (`pzuhokmwlgobqhwottpa`) is active. All ten repository migrations are applied, including the feedback import and `20261017000200_marketing_inputs_sync.sql`. No reset was performed.
- Read-only cloud checks returned HTTP 200 for `cv_analyses`, `company_profiles`, `employer_content`, `mentor_reviews`, `simulation_attempts` and `simulation_submission_evaluations`.
- Cloud buckets `candidate-cvs` and `business-documents` are private, with a 3 MiB limit.
- Vercel Production has `NEXT_PUBLIC_SITE_URL` set to the production URL and `GEMINI_MODEL=gemini-3.5-flash`.

- User permission received: the local `GEMINI_API_KEY` and cloud `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` are stored in Vercel Production. Existing Preview values were preserved in separate records. Local development settings remain unchanged.
- Production redeploy `dpl_F492do4iwHx6W91BBJt3L83oSsBS` is Ready with those values. `/`, `/signup`, `/signin` and `/api/health` returned HTTP 200.
- Supabase Site URL is `https://ready-2work.vercel.app`, with confirmation/recovery redirects allowed. The previous smoky domain remains allowed for compatibility.

## Remaining configuration

SMTP setup was deferred at the user’s request; keep the default email service for now. The hosted dashboard was checked directly. Custom SMTP is disabled. Confirm signup uses the default `{{ .ConfirmationURL }}` template. On this Free project the dashboard requires custom SMTP or Pro to edit email templates; no paid upgrade was made.

1. Configure the user's chosen SMTP provider with a verified sender. Enter the SMTP credential directly in Supabase; never commit it or include it in this document.
2. The feedback patch supports the default PKCE `code` callback as well as custom `token_hash` templates. Custom SMTP/templates are optional follow-up work; do not disable verification or overwrite hosted configuration with local Supabase config.
3. Run one focused signup → confirmation → signin check using an approved test email. Check one real CV analysis separately; no live AI acceptance is claimed here.

No full unit/browser suite was rerun for this deployment configuration work. Successful hosting and schema checks do not yet establish that hosted authentication, email delivery and AI work end to end.

## Report/dashboard follow-up

- Direct PDF download, account-scoped access, bundled Vietnamese fonts and page numbers implemented. No PDF export provider receives candidate data.
- Target-role dashboard recommendations work immediately after CV analysis; completed and closed content are excluded.
- Next.js and its lint config updated to 16.4.2. Production audit no longer reports Next.js, sharp or PostCSS advisories; existing moderate Mammoth/transitive advisories remain (no unsafe auto-downgrade applied).
- Functions configured for Singapore (`sin1`), near the existing cloud database. Confirm actual function placement on the deployment after publishing; no end-to-end speed measurement is claimed.
- Focused report checks and one local browser flow passed. Local build traces both PDF font files. No cloud data migrations were added by this follow-up.

## Feedback and source synchronization — published

- Canonical domain remains `ready-2work.vercel.app`.
- New additive migration: `20261017000100_feedback_content.sql`; 15 source roles, 15 simulations and 15 interview sets/120 questions. It retains prior sets/questions/answers and flags superseded open simulation attempts; no reset or history deletion.
- Cloud migration applied after dry-run. Read-only checks confirm 15 simulations (12 open for grading), 15 current interview sets (7 open for grading), 120 current questions, the superseded-attempt column and the authorized Marketing inputs.
- Marketing supplementary facts now have one canonical source; the generator merges them into public materials once. A separate additive patch updates only the three public-material lists, preserving the already-published migration, rubrics and history. Supplementary product labels/descriptions use Vietnamese.
- Three banking simulations and eight interview sets allow content review while official grading awaits source clarification. Marketing supplementary input facts were explicitly authorized and are labeled simulated; their authored rubric weights were preserved.
- New CV percentages await the owner's weight table. Image PDF OCR is configured, with consent and private file handling.
- Default Supabase email callbacks support PKCE as well as token hashes. Local signup/signin/session behavior and fixture return-login were checked; existing cloud-account/email delivery is not claimed as verified.
- Live QA question 2 accepted the short synthetic answer with three validated criteria. The following Financial request stopped with provider HTTP 429; there is no fake saved evaluation.
