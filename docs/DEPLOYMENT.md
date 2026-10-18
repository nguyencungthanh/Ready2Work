# Deployment status — 18/10/2026

## PDF CV reading — 18/10/2026

- CV uploads now accept PDF only in the file picker, drag-and-drop validation and server reader. The existing 3 MiB/15-page limits and pasted-text option are retained. Uploaded PDFs receive an explicit `application/pdf` content type; existing history is preserved.
- Image-containing and mixed-content PDFs are recognized in full. Each text-only page is checked for readable text, and valid PDFs recover through OCR if their local parser fails. Corrupt/encrypted files receive specific errors before an AI request.
- OCR uses a dedicated 45-second provider timeout, and the CV page declares a 180-second Server Action budget. Vercel's existing project configuration was confirmed to have Fluid compute enabled; no project settings or environment values changed.
- Temporary HTTP 503 responses receive one retry in CV analysis. Provider quota failures are shown separately from PDF parsing failures and do not save a new result.
- Business assignment reading is separate from the CV reader, preserving its existing PDF/DOCX/TXT formats and the editor's generated TXT documents. The full browser suite identified this shared-reader coupling; focused format-boundary regression checks were added before the follow-up publication.
- Validation: 292 unit checks, production build/TypeScript and lint passed. Three synthetic PDF formats passed real Gemini OCR without losing image text or native headings. Separate live analysis reached the test provider's free-tier daily quota (20 requests/day), so a complete live analysis success is not claimed. No personal CV or account data was sent in these checks.
- Details and opt-in reproduction: [CV PDF verification](validation/cv-pdf-20261018.md).

## Authentication and email follow-up — 18/10/2026

- Auth fixes in `c90ff12` are deployed. Vercel deployment `dpl_FLTQRWyyJJck5QnfvCv3qpQS2EnX` is Ready and owns `ready-2work.vercel.app`; functions remain in `sin1`.
- The email-quota message follow-up `b1a2079` is also deployed: `dpl_ADs3zyJMPNQzpNGFLXmmveMCTzTt`, Ready, canonical alias unchanged. Its thirteen focused unit checks and changed-file lint passed.
- Focused local email/auth flows and cloud account/data-isolation checks passed; see [validation details](VALIDATION.md). Hosted signup confirmation, password signin, profile creation/persistence and owner password recovery have now passed real email round trips.
- The owner reported persistent reset throttling. The hosted SMTP page confirms custom SMTP is disabled. The default Supabase service currently permits two messages per hour per project and only delivers to organization team addresses; it cannot support unrestricted public signup.
- Keep Supabase Auth/database. For testing without a custom domain, prepare Gmail SMTP: host `smtp.gmail.com`, port `465`, sender name `Ready2Work`. Sender address and username must be the same Gmail account. Use a dedicated Google app password, never the normal Google password.
- Google 2-Step Verification was confirmed active; the owner created an app password and saved SMTP. The SMTP username was corrected from the app label to the Gmail address. A page reload confirms custom SMTP enabled, matching sender/username, host `smtp.gmail.com` and port `465`. The hosted email rate limit is now 30/hour, with a 60-second per-user interval.
- The initial Gmail `535` rejection was resolved after the owner re-entered/saved the app password. The 03:15 recovery request completed with Auth HTTP 200 and reached the inbox. Its native PKCE callback later returned HTTP 422, so the hosted email templates were aligned with the existing server-side token-hash callback.
- With explicit permission for CLI Keychain access and the macOS one-time approval, Management API updated/read back exactly the confirmation/recovery subjects and HTML from the repository. Only the API's derived custom-content maps also changed. Email confirmation remains enabled and OTP expiration remains 3600 seconds; SMTP and other Auth configuration were preserved. No credential was printed or written to a file.
- A Vietnamese recovery email at 03:34 opened `/update-password` successfully. The owner entered the new password and confirmed successful signout/signin; the authenticated dashboard was then observed.
- One temporary Gmail +alias fixture used the public Auth signup endpoint. Before confirmation, password signin was blocked. The Vietnamese confirmation email arrived; its link opened the fixture dashboard in a separate incognito window. Password signin, the persisted profile and anonymous-access blocking passed. The fixture account/profile were deleted and the test window closed. The public signup form itself was covered by the earlier local browser checks.
- Gmail is the current test sender; the dashboard warns that personal-mail providers can have delivery issues. Receipt was checked in the approved Gmail mailbox, not across multiple email providers.

## Source-only release preparation — 18/10/2026

- Canonical URL remains https://ready-2work.vercel.app; publish from GitHub `main` to the existing `ready2work-platform` project. Verify the deployment is Ready and owns this alias after pushing.
- `20261017000300_document_only_catalog.sql` was dry-run, tested locally and applied successfully to cloud. All eleven migrations are applied; no reset or history deletion.
- Read-only cloud comparison confirms all fields of the fifteen current simulations match the generated source data, all 120 prompts/reference answers/rubrics match the document source, fifteen current interview sets remain, and all seventeen known legacy demos are archived. Current grading availability is nine simulations and seven interview sets.
- The earlier authored Marketing supplement is removed from current reference data. Original source material only; three missing Marketing documents and the unresolved rubric/question conflicts remain explicit.
- The candidate catalog/recommendations use source slugs; actual published company content remains separate. Existing account/history data and the Report/readiness formula are preserved.
- Production build, TypeScript, changed-file lint, focused unit/content/database checks and one local Chromium flow passed. The simulation route NFT includes the twenty original input PNGs and no answer-key images. No deployment environment values changed.
- With explicit owner permission for source images, a real Gemini Business Analyst evaluation with a synthetic answer passed exact criterion/maximum/feedback validation. No cloud test account or personal CV was used.

## Confirmed

- Feedback application baseline: `161edad`, deployment `dpl_H3p9wb8tRrMiDA5DgNaxGtdmv7Xw`, Ready. The documentation follow-up `eb67519` is also Ready. Both confirm the canonical alias `ready-2work.vercel.app` and functions in `sin1`.
- After publication, `/`, `/signup`, `/signin`, `/api/health` and an original input image returned HTTP 200. The input image matches the repository SHA-256; private answer-key image `14.png` returns 404. These public checks do not assert end-to-end email delivery or provider availability.
- GitHub: `nguyencungthanh/Ready2Work`, branch `main`.
- Vercel project: `ready2work-platform`, root directory `platform`, Next.js preset.
- Production URL: https://ready-2work.vercel.app
- The user preferred the original domain. It was moved from `ready2-work` to the configured `ready2work-platform` project without deleting either project. Vercel `NEXT_PUBLIC_SITE_URL` and Supabase Site URL now use `https://ready-2work.vercel.app`; its confirmation and recovery redirects are allowed. The previous smoky domain remains an alias.
- Commit `adf3474` built successfully on Vercel Linux. The lockfile now includes the Linux x64 GNU optional bindings for Lightning CSS, Tailwind Oxide and the resolver; installation uses `npm ci --include=optional`.
- Production `/`, `/signup` and `/api/health` returned HTTP 200. The signup page contains the current UI. The health endpoint does not validate database connectivity.
- Supabase project `ready2work-production` (`pzuhokmwlgobqhwottpa`) is active. All eleven repository migrations are applied, through `20261017000300_document_only_catalog.sql`. No reset was performed.
- Read-only cloud checks returned HTTP 200 for `cv_analyses`, `company_profiles`, `employer_content`, `mentor_reviews`, `simulation_attempts` and `simulation_submission_evaluations`.
- Cloud buckets `candidate-cvs` and `business-documents` are private, with a 3 MiB limit.
- Vercel Production has `NEXT_PUBLIC_SITE_URL` set to the production URL and `GEMINI_MODEL=gemini-3.5-flash`.

- User permission received: the local `GEMINI_API_KEY` and cloud `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` are stored in Vercel Production. Existing Preview values were preserved in separate records. Local development settings remain unchanged.
- Production redeploy `dpl_F492do4iwHx6W91BBJt3L83oSsBS` is Ready with those values. `/`, `/signup`, `/signin` and `/api/health` returned HTTP 200.
- Supabase Site URL is `https://ready-2work.vercel.app`, with confirmation/recovery redirects allowed. The previous smoky domain remains allowed for compatibility.

## Email configuration and operating limits

The earlier SMTP deferral is superseded by the email follow-up above. Gmail custom SMTP is enabled, with real signup and recovery email flows verified. The hosted subjects and bodies now match `platform/supabase/templates/` and the subjects in `platform/supabase/config.toml`. No paid upgrade was made.

- Email quota: 30/hour per project, minimum 60 seconds between messages to the same user.
- Confirmation uses `/auth/confirm?token_hash={{ .TokenHash }}&type=email`; recovery uses `type=recovery`. The callback also retains support for existing PKCE `code` links.
- Keep email confirmation enabled. Do not overwrite hosted settings with the full local Supabase configuration.

No full suite was rerun for SMTP/template configuration. Eleven focused callback unit checks and the two template link/subject checks passed. Provider setup references: [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [SSR email templates](https://supabase.com/nextjs), [Google app passwords](https://support.google.com/mail/answer/185833?hl=en).

## Report/dashboard follow-up

- Direct PDF download, account-scoped access, bundled Vietnamese fonts and page numbers implemented. No PDF export provider receives candidate data.
- Target-role dashboard recommendations work immediately after CV analysis; completed and closed content are excluded.
- Next.js and its lint config updated to 16.4.2. Production audit no longer reports Next.js, sharp or PostCSS advisories; existing moderate Mammoth/transitive advisories remain (no unsafe auto-downgrade applied).
- Functions configured for Singapore (`sin1`), near the existing cloud database. Confirm actual function placement on the deployment after publishing; no end-to-end speed measurement is claimed.
- Focused report checks and one local browser flow passed. Local build traces both PDF font files. No cloud data migrations were added by this follow-up.

## Historical feedback publication — 17/10/2026

The authorized Marketing supplementation in this older release was superseded by the document-only instruction and migration recorded above. The following entries describe the historical rollout.

- Canonical domain remains `ready-2work.vercel.app`.
- New additive migration: `20261017000100_feedback_content.sql`; 15 source roles, 15 simulations and 15 interview sets/120 questions. It retains prior sets/questions/answers and flags superseded open simulation attempts; no reset or history deletion.
- Cloud migration applied after dry-run. Read-only checks confirm 15 simulations (12 open for grading), 15 current interview sets (7 open for grading), 120 current questions, the superseded-attempt column and the authorized Marketing inputs.
- Marketing supplementary facts now have one canonical source; the generator merges them into public materials once. A separate additive patch updates only the three public-material lists, preserving the already-published migration, rubrics and history. Supplementary product labels/descriptions use Vietnamese.
- Three banking simulations and eight interview sets allow content review while official grading awaits source clarification. Marketing supplementary input facts were explicitly authorized and are labeled simulated; their authored rubric weights were preserved.
- New CV percentages await the owner's weight table. Image PDF OCR is configured, with consent and private file handling.
- Default Supabase email callbacks support PKCE as well as token hashes. Local signup/signin/session behavior and fixture return-login were checked; existing cloud-account/email delivery is not claimed as verified.
- Live QA question 2 accepted the short synthetic answer with three validated criteria. The following Financial request stopped with provider HTTP 429; there is no fake saved evaluation.
