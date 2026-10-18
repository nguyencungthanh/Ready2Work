# CV upload diagnosis — 18 October 2026

## Current evidence

- The production CV page displayed: “Đã đọc được CV nhưng AI chưa hoàn tất phân tích.” This message is returned by the analysis-stage catch block, before storage upload and result insertion. It does not identify a particular provider error.
- A minimal structured request using the local runtime's configured Gemini key and default `gemini-3.5-flash` model succeeded in 2.473 seconds. The test and runtime Gemini key/model were compared in memory and matched; neither key was printed.
- The existing opt-in real-provider scan-PDF test passed. The synthetic PDF contained no personal/contact data.
- In the same real-provider run, the existing synthetic CV analysis test failed after 20.506 seconds at `lib/cv/analyzer.ts:116`: `AI returned evidence not present in the CV. Please try again.` Gemini returned parseable analysis, but at least one matched/partial finding had empty evidence or evidence that was not an exact substring of the input CV. This is a response-validation failure, rather than an HTTP availability/quota failure.
- The ordinary unit suite passed: 49 files, 292 tests. These deterministic checks do not establish that real model output will always satisfy the evidence contract.
- Local Supabase checks could not connect: `.env.local` targets `127.0.0.1:54321`. This is a separate local environment limitation and is not evidence of a production Supabase outage.

## Interpretation and limits

The recheck does not support attributing all current failures to Gemini downtime or exhausted quota. A concrete failure is reproducible at the boundary between Gemini output and application evidence validation. Rejecting unsupported evidence protects result accuracy; the application currently presents that rejection with the same generic analysis message used for other non-429 failures.

The earlier HTTP 503/429 observations in `cv-pdf-20261018.md` remain historical evidence, not the result of this new check. The precise cause of the owner's already-failed production request remains unconfirmed because its server-side error was not available. The CV action currently does not log its caught analysis errors.

No personal CV was submitted or account records created during diagnosis. No production settings, model or credentials were changed.

## Implemented follow-up

- The application splits CV text into numbered excerpts, preserving the exact original text (including Unicode and PDF whitespace). Gemini selects up to three excerpt IDs per finding. The server reconstructs `candidateEvidence` from those excerpts; model-written quotes are never used. Saved results keep the existing shape and historical analyses remain readable.
- Every Golden Profile requirement must appear exactly once. Unknown/duplicate excerpt IDs, evidence attached to a `missing` finding, and absent evidence for `matched`/`partial` findings are rejected.
- Analysis has a shared limit of two provider calls, covering temporary 503/timeouts and one corrective request for invalid JSON, empty responses, invalid schemas, incomplete findings or invalid evidence references. Quota/authentication/input failures are not retried. CV analysis uses a dedicated 35-second request timeout; the maximum two OCR requests plus two analysis requests total 160 seconds within the existing 180-second page budget, before local processing/storage overhead.
- The action logs only a request ID, hashed owner ID, stage, elapsed time, safe error code and HTTP status. Messages distinguish quota, overload, timeouts, incomplete output and invalid evidence. Cleanup failure no longer masks the original save failure.
- The client explicitly dispatches the action inside a React transition. It retains the selected `File` in memory and retains pasted text/consent across failures. A remove-file button clears the retained file so pasted text can be submitted. Native form validation and the pending indicator remain active.

## Verification and remaining external limit

- Unit checks cover evidence reconstruction, Unicode/long source segments, corrective requests, incomplete/duplicate/foreign requirement IDs, invalid/missing/contradictory citations, empty/malformed output, bounded retries, quota handling, safe logging and failed cleanup.
- An opt-in Chromium check uses the real CV form and React action state with a synthetic server action. It confirms the same PDF bytes are submitted on retry, consent survives failure, removing a PDF enables pasted-text submission, and pasted text survives retry. It makes no external calls and creates no account records. Reproduce with `R2W_RUN_CV_UI=1 npx vitest run tests/integration/cv/form-retry.test.ts` from `platform`.
- Final production build/TypeScript and changed-file lint passed. The full unit suite passed: 50 files, 320 tests. The isolated Chromium form retry/removal/pasted-text check also passed.
- Live verification of the new analysis contract encountered HTTP 503, followed by HTTP 429. The provider reported its free-tier daily quota of 20 requests exhausted, with a retry delay of roughly ten hours at 21:01 Vietnam time on 18 October. The error reported the provider-side model name `gemini-3.6-flash`; the repository still requests its existing `gemini-3.5-flash` setting/default. No model switch or quota/billing change was made.
- No further live calls were made after the quota failure. The opt-in mixed-PDF OCR + analysis check remains unverified with the real provider. Account-scoped production upload/save and production deployment are not claimed as completed by this workspace change.

## New-key production investigation

The owner confirmed the replacement key belongs to a different Google project and that the tested website is `ready-2work.vercel.app`. Read-only Vercel UI inspection then confirmed a separate deployment/configuration mismatch:

- The owner recently updated `GEMINI_API_KEY` for Production/Preview in Vercel project `ready2-work` and redeployed that project (`dpl_3Dcr4wJVTrcqGyNKaCEMNWSUNLpq`, source `a026921`). Its domain settings showed no added domains, and its deployment listed only its generated `ready2-work-*` aliases.
- Vercel project `ready2work-platform` owns `ready-2work.vercel.app`, marked Valid Configuration / Production. It also owns the existing smoky alias.
- The Production Gemini key on `ready2work-platform` showed Updated 1h ago, while the replacement on `ready2-work` showed Updated 7m ago at inspection. Secret values were not revealed, compared, copied or changed.

The recently observed replacement/redeployment therefore targeted a different Vercel project from the owner's tested domain. The correct Production environment-variable page was opened for the owner. The next action is to enter the intended replacement key in `ready2work-platform` and redeploy that project, then check its real provider response. This finding does not establish the replacement key's remaining quota; prior live failures used the local key.

## Owner-requested consolidation on ready2-work

The owner subsequently requested that hosting move entirely to `ready2-work`. Both configured domains were moved there, the workspace was relinked, and the old project's Git deployment connection was removed while retaining its history. The canonical URL and Supabase project remain unchanged. Production cutover is recorded in `../DEPLOYMENT.md`.

In the new project's actual build environment, Supabase Auth/table/storage preflight checks passed and a minimal Gemini request using its existing replacement key succeeded. A separate synthetic full CV check then encountered two HTTP 503 responses for analysis; the mixed PDF completed reading but its subsequent analysis received HTTP 429 for the provider's daily limit of 20. This is fresh evidence from the destination project's environment, independent of the earlier local-key quota result. Full live analysis success is still not claimed. No personal CV or account data was submitted in these provider checks.
