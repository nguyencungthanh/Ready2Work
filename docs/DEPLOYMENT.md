# Deployment status — 17/10/2026

## Confirmed

- GitHub: `nguyencungthanh/Ready2Work`, branch `main`.
- Vercel project: `ready2work-platform`, root directory `platform`, Next.js preset.
- Production URL: https://ready-2work.vercel.app
- The user preferred the original domain. It was moved from `ready2-work` to the configured `ready2work-platform` project without deleting either project. Vercel `NEXT_PUBLIC_SITE_URL` and Supabase Site URL now use `https://ready-2work.vercel.app`; its confirmation and recovery redirects are allowed. The previous smoky domain remains an alias.
- Commit `adf3474` built successfully on Vercel Linux. The lockfile now includes the Linux x64 GNU optional bindings for Lightning CSS, Tailwind Oxide and the resolver; installation uses `npm ci --include=optional`.
- Production `/`, `/signup` and `/api/health` returned HTTP 200. The signup page contains the current UI. The health endpoint does not validate database connectivity.
- Supabase project `ready2work-production` (`pzuhokmwlgobqhwottpa`) is active. All eight repository migrations are applied. Only the three missing additive migrations were pushed; no reset was performed.
- Read-only cloud checks returned HTTP 200 for `cv_analyses`, `company_profiles`, `employer_content`, `mentor_reviews`, `simulation_attempts` and `simulation_submission_evaluations`.
- Cloud buckets `candidate-cvs` and `business-documents` are private, with a 3 MiB limit.
- Vercel Production has `NEXT_PUBLIC_SITE_URL` set to the production URL and `GEMINI_MODEL=gemini-3.5-flash`.

- User permission received: the local `GEMINI_API_KEY` and cloud `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` are stored in Vercel Production. Existing Preview values were preserved in separate records. Local development settings remain unchanged.
- Production redeploy `dpl_F492do4iwHx6W91BBJt3L83oSsBS` is Ready with those values. `/`, `/signup`, `/signin` and `/api/health` returned HTTP 200.
- Supabase Site URL was changed from the legacy domain to `https://ready2work-platform-smoky.vercel.app`. Additional redirects `/auth/confirm` and `/auth/confirm?type=recovery` on that domain were saved successfully. The existing legacy redirect was preserved.

## Remaining configuration

SMTP setup was deferred at the user’s request; keep the default email service for now. The hosted dashboard was checked directly. Custom SMTP is disabled. Confirm signup uses the default `{{ .ConfirmationURL }}` template. On this Free project the dashboard requires custom SMTP or Pro to edit email templates; no paid upgrade was made.

1. Configure the user's chosen SMTP provider with a verified sender. Enter the SMTP credential directly in Supabase; never commit it or include it in this document.
2. Apply the Confirm signup and Reset password token-hash templates from `platform/supabase/templates/confirmation.html` and `recovery.html`. The app's `/auth/confirm` route expects `token_hash` and `type`; the currently hosted default template does not match that contract. Do not disable email confirmation or push the entire local Supabase config over the hosted configuration.
3. Run one focused signup → confirmation → signin check using an approved test email. Check one real CV analysis separately; no live AI acceptance is claimed here.

No full unit/browser suite was rerun for this deployment configuration work. Successful hosting and schema checks do not yet establish that hosted authentication, email delivery and AI work end to end.

## Report/dashboard follow-up

- Direct PDF download, account-scoped access, bundled Vietnamese fonts and page numbers implemented. No PDF export provider receives candidate data.
- Target-role dashboard recommendations work immediately after CV analysis; completed and closed content are excluded.
- Next.js and its lint config updated to 16.4.2. Production audit no longer reports Next.js, sharp or PostCSS advisories; existing moderate Mammoth/transitive advisories remain (no unsafe auto-downgrade applied).
- Functions configured for Singapore (`sin1`), near the existing cloud database. Confirm actual function placement on the deployment after publishing; no end-to-end speed measurement is claimed.
- Focused report checks and one local browser flow passed. Local build traces both PDF font files. No cloud data migrations were added by this follow-up.
