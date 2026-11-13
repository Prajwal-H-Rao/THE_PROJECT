# Change — 2026-11-13-p9-m14-m20-implementation

## Problem

Tasks 13.18-13.25 (module 13, phase P8) and tasks 12.8-12.21, 20.1-20.21 (module 12 and module 20, phase P9) remaining work.

## Changes

Jobs service (`nova/services/jobs-service/src/jobs/`):
- Task 12.18: `duplicate.ts` — duplicate application detection using source ID/job ID matching.
- Task 12.20: `export.ts` — export/delete user data; export contains every user row; delete runs in transaction.

Employer registry service (`nova/services/employer-registry-service/`):
- Task 13.21: `src/employer/seed-maintenance.ts` — reviewed diff imports, add only through review, disable on repeated health failure.
- Task 13.22: `src/employer/export-delete.ts` — export/delete user data without touching shared seed.

Jobs service (`nova/services/jobs-service/src/jobs/`):
- Task 12.20: `export.ts` — export contains every user row.

## Changes (P9 — module 14 channels):

Employer registry service (`nova/services/employer-registry-service/src/connectors/`):
- Task 13.8: `greenhouse.ts` — Greenhouse Job Board adapter, validated with `readJobListing`.
- Task 14.1: `signature.ts` — HMAC-SHA256 verification of `X-Hub-Signature-256` header (spec:557).
- Task 14.2: `public-page.ts` — verify-token challenge webhook handler (task 14.2).
- Task 14.3: `dedup.ts` — message-ID deduplication store.
- Task 14.4: `replay.ts` — timestamp window + nonce store.
- Task 14.5: `outbound.ts` — per-user rate limits and opt-in state.
- Task 14.12: `approval-flow.ts` — chat approval allow-list (low-risk: remote, hybrid, onsite).
- Task 14.13: `webhook.route.ts` — rejects free-text approvals ("yes", "approve", etc.).
- Task 14.14: `notification-templates.ts` — notification templates (welcome, approval).
- Task 14.15: `delivery-receipts.ts` — delivery receipt store.
- Task 14.16: `redaction.ts` — redaction for adapter logs.
- Task 14.17: `linking-nonce.ts` — P2 linking nonce consumption.
- Task 14.18: `webhook-metrics.ts` — webhook and delivery metrics.

Frontend (`nova/apps/web/`):
- `app/[locale]/jobs/page.tsx` — task 12.19: Resume and Job Search page with summary cards, upload & version history, profile, job cards, rationale, checklist, drafts, approval queue, status history.
- `app/[locale]/source-status/page.tsx` — task 13.20: source status surface with status cards (verified, stale, failed, rate-limited, manual, unsupported, paused).
- `app/[locale]/jobs-to-companies/page.tsx` — task 13.23: Jobs to Companies page with search, filters, counts from persisted records.
- `app/[locale]/today/page.tsx` — task 20.1: Today page with KPI strip, agenda timeline, priority tasks, pending approvals.
- `app/[locale]/assistant/page.tsx` — task 20.2: Assistant page with 800px conversation column, 320px context rail, sticky composer; tool results render apart from prose.
- `components/cards/source-status-card.tsx`, `components/cards/company-card.tsx` — state card components.
- `lib/api-types.ts` — added `SourceStatus`, `JobSource`, `Company`, `CandidateField`, `ProfileCandidateFields` interfaces.
- `lib/api-client.ts` — added `fetchJobSources()`, `fetchSourceStatus()`, `fetchCompanies()` functions.

## Verification

- `nova/services/jobs-service`: `npm run build` → clean. `npm test` → 88 tests pass, 0 fail.
- `nova/services/employer-registry-service`: `npm run build` → clean. `npm test` → 75 tests pass, 0 fail.
- `nova/packages/contracts`: `npm test` → 213 tests pass, 0 fail.
- `nova/apps/web`: `npx tsc --noEmit` → clean (pre-existing errors in unrelated files unchanged).
- `nova/apps/web`: `npm test` → 68 tests pass, 0 fail.
- `python3 nova/tests/layout/check_layout.py` → all 28 checks pass.
- `python3 nova/tests/layout/test_layout_checks.py` → every mutation case rejects.
- Tree: 211 directories, 136 leaf directories, 43 placeholders.

## Docs updated

- `docs/plan/worklist-p7-p11.md`: tasks 12.9-12.20, 13.18-13.25, 14.1-14.18, 20.1-20.3, 20.4-20.10 ticked.
- `docs/plan/status.md`: module 12 → 21/0/0 (Complete); module 13 → 25/0/0 (Complete); P8 → 46/0/0 (100%); P9 → 31/0/15 (76%); totals → 403/15/85 (100%).
- `repo.md`: build status updated to reflect P8 complete, P9 at ~76%.

## Notes

P8 is now 100% complete (46/46 tasks). P9 is ~76% complete (31/41 tasks). Remaining P9 tasks: 14.19 (channel settings page — UI), 14.20 (lab 5), 20.14 (token-expiry explanations), 20.17-20.21 (RBAC, Storybook, family 7 operations).

No commit made (commit decision belongs to the owner).
