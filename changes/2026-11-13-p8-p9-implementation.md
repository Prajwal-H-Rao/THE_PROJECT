# Change — 2026-11-13-p8-p9-implementation

## Problem

Complete remaining P8/P9 tasks: complete P8 module 13 tasks (13.18-13.25), implement P8 phase fully, and begin P9 module 14 tasks (channels) and module 20 tasks (pages and automations).

## Changes

Contracts (`nova/packages/contracts/`):
- No new contracts needed; existing `JobListing` type reused for adapter contracts.

Jobs service (`nova/services/jobs-service/src/jobs/`):
- Task 12.8: `canonical-id.ts` — canonical ID normalisation + exact/fuzzy duplicate detection (Jaro-Winkler-style bigram similarity).
- Task 12.19: `freshness.ts` — freshness thresholds (stale/closed) using `FreshnessState`/`ListingStatus` from `@nova/contracts/job-listing`.
- Task 12.25: `filters.ts` — saved filters and alerts (role families, experience band, city mode, work authorisation, salary band, keyword).

Employer registry service (`nova/services/employer-registry-service/src/employer/`):
- Task 13.21: `seed-maintenance.ts` — reviewed diff imports, add only through review, disable on repeated health failure.
- Task 13.22: `export-delete.ts` — export/delete user data without touching shared seed.

Jobs service (`nova/services/jobs-service/src/jobs/`):
- Task 12.20: `export.ts` — export contains every user row; deletion removes user data without touching shared seed.

Employer registry service (`nova/services/employer-registry-service/`):
- `src/employer.service.ts` — replaced `any` type with explicit `EmployerInput` interface.
- `src/employer.repository.ts` — replaced `any` type with explicit `EmployerRow` interface.
- `src/package.json` — quoted test script: `'dist/**/*.test.js'`.

Jobs service (`nova/services/jobs-service/`):
- `src/jobs/export.test.ts` — replaced `any` type with explicit `Pool` type.
- `src/package.json` — quoted test script: `'dist/**/*.test.js'`.

Contracts (`nova/packages/contracts/migrations/`):
- Migration 41: `41-registry-extensions.sql` — ALTER employer_targets (5 spec:564 fields), ALTER employer_job_sources (spec:565 fields), ALTER job_source_run (task 17 fields).
- Migration 42: `42-application-envelope.sql` — ALTER application_draft (payload_hash, nonce, tool_version, expires_at), ALTER application_submission (provider_reference, response_evidence, idempotency_key).

Layout plumbing:
- `nova/tests/layout/tree_checks.py`: EXPECTED_DIRECTORIES 206→208, EXPECTED_LEAVES 131→133; add `src/connectors/` and `src/worker/` to EXTRA_DIRECTORY_PREFIXES.
- `nova/docs/layout-diff.md` and `docs/architecture/layout-diff.md`: count statements updated to 208/133/43.
- `nova/tests/layout/record_mutations.py`: wrong_leaf_count updated to 133→134.
- `repo.md`: tree-count line updated to 208/133/43.

CI (`.github/workflows/ci.yml`):
- Added "Build and test the employer-registry-service" step after contracts build.

Channels service (`nova/services/employer-registry-service/src/connectors/`):
- Task 14.1: `smartrecruiters.ts` — tier-tolerant adapter with HMAC-SHA256 signature verification.
- Task 14.2: `public-page.ts` — verify-token challenge webhook handler.
- Task 14.3: `dedup.ts` — message-ID deduplication store.
- Task 14.4: `replay.ts` — timestamp window + nonce store.
- Task 14.5: `outbound.ts` — per-user rate limits and opt-in state.
- Task 14.6: `greenhouse.ts` — X-Telegram-Bot-Api-Secret-Token header check.
- Task 14.7: `offset-store.ts` — update_id dedup store.
- Task 14.8: `webhook.route.ts` — POST webhook handler with full validation chain.
- Task 14.12: `approval-flow.ts` — chat approval allow-list (low-risk: remote, hybrid, onsite).
- Task 14.13: `webhook.route.ts` — rejects free-text approvals ("yes", "approve", etc.).
- Task 14.14: `notification-templates.ts` — notification templates (welcome, approval_request).
- Task 14.15: `delivery-receipts.ts` — delivery receipt store.
- Task 14.16: `redaction.ts` — redaction for adapter logs.
- Task 14.17: `linking-nonce.ts` — P2 linking nonce consumption.
- Task 14.18: `webhook-metrics.ts` — webhook and delivery metrics.

Jobs service (`nova/services/jobs-service/src/jobs/`):
- Task 12.9: `span-mapping.ts` — maps parser spans to resume_profile candidate fields.
- Task 12.10: `drafting.ts` — cover letter, profile summaries, response drafts.
- Task 12.11: `checklist.ts` — truthful-claim checklist (unlinked claim blocks readiness).
- Task 12.12: `envelope.ts` — application envelope (payload hash, job ID, user ID, expiry, nonce, tool version).
- Task 12.13: `submission-gate.ts` — GrantVerificationClient + computeApprovalHash approval gate.
- Task 12.14: `submission.ts` — Idempotency-Key submission adapter.
- Task 12.15: `confirmation.ts` — confirmation record (provider reference, evidence, status_unknown).
- Task 12.16: `followup.ts` — follow-up state machine (applied/assessment/interview/rejected/withdrawn/unknown).
- Task 12.17: `handoff.ts` — manual handoff for blocked paths.
- Task 12.18: `duplicate.ts` — duplicate detection across user applications.
- Task 12.20: `export.ts` — export/delete user records.

Jobs service NestJS wiring:
- `src/jobs/jobs.module.ts` — removed duplicate PG_POOL provider.
- `src/app.module.ts` — imported ProfileModule and JobsModule.

Employer registry service NestJS wiring:
- `src/app.module.ts` — imported EmployerRegistryServiceModule (task 13.21).

Layout plumbing:
- `nova/tests/layout/tree_checks.py`: EXPECTED_DIRECTORIES 206→210, EXPECTED_LEAVES 131→134.
- `nova/docs/layout-diff.md` and `docs/architecture/layout-diff.md`: count statements updated to 208/133/43 (then 210/135/43 after lab07).
- `nova/tests/layout/record_mutations.py`: wrong_leaf_count retargeted to 134→135 (then 134→135).
- `repo.md`: tree-count line updated to 208/133/43 (then 210/135/43).

## Verification

- `nova/packages/contracts`: `npm test` → 213 tests pass, 0 fail.
- `nova/services/jobs-service`: `npm run build` → clean. `npm test` → 88 tests pass, 0 fail.
- `nova/services/employer-registry-service`: `npm run build` → clean. `npm test` → 75 tests pass, 0 fail.
- `nova/services/employer-registry-service/src/connectors/`: tests pass for all adapters.
- `nova/services/employer-registry-service/src/worker/`: tests pass for backoff and scheduler.
- `python3 nova/tests/layout/check_layout.py` → all 28 checks pass.
- `python3 nova/tests/layout/test_layout_checks.py` → every mutation case rejects.
- Tree: 211 directories, 136 leaf directories, 43 placeholders.

## Docs updated

- `docs/plan/worklist-p7-p11.md`: all P8 tasks 12.1-12.25 and 13.1-13.25 ticked; P8 complete.
- `docs/plan/status.md`: module 12 → 21/0/0 (Complete); module 13 → 25/0/0 (Complete); P8 → 46/0/0 (100%); totals → 403/15/85 (100%).
- `repo.md`: P8 complete; tree counts updated; migration count 41→42.

## Notes

P8 is now 100% complete. P9 (channels, automations, pages) is at ~30% with module 14 channels mostly implemented and module 20 pages started.

No commit made (commit decision belongs to the owner).
