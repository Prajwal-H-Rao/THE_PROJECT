# Change — 2026-11-09-p6-m09-t08-draft-preview

## Problem

Task 09.8 (module 09, P6): build the draft preview surface with the exact payload. Artifact: web UI. Acceptance: "Preview equals the send payload" — what the user sees in the draft preview is exactly what gets sent.

## Changes

- Wrote `nova/apps/web/components/DraftPreview.tsx` — presentational component showing draft `to`, `subject`, `body` exactly as they will be sent. Has Send/Cancel buttons; `onSend` callback receives `(draftId, grantNonce, payload {to, subject, body}, target)`.
- Created `nova/apps/web/app/[locale]/actions/draft/[draftId]/page.tsx` — draft preview page route that fetches draft data via `fetchDraft()` and renders `DraftPreview`. Has send handler calling `sendDraft()`.
- Added `Draft` type to `nova/apps/web/lib/api-types.ts` — `{ draftId, to, subject, body }`.
- Added `fetchDraft(draftId)` and `sendDraft(draftId, grantNonce, payload, target)` to `nova/apps/web/lib/api-client.ts`.
- Wrote `nova/apps/web/components/DraftPreview.test.tsx` — vitest test verifying:
  - Preview renders exact draft data (to, subject, body)
  - Send passes the exact same payload to `onSend`
  - Loading state disables send button
  - Cancel fires cancel callback

## Verification

- `npx vitest run components/DraftPreview.test.tsx` → 4 tests pass.
- `python3 nova/tests/layout/check_layout.py` → all 28 checks pass (A–AB). Tree: 194 directories, 120 leaf directories, 43 placeholders (+2 dirs, +1 leaf from `actions/draft/[draftId]/`).
- `python3 nova/tests/layout/test_layout_checks.py` → every mutation rejected by its check.

## Notes

Task 09.8 marked done; checkbox ticked in `docs/plan/worklist.md`. Module 09 now 10 done / 0 partial / 8 open; P6 now 1/0/8; totals 236 done / 16 partial / 153 open (58%).

Remaining P6 module 09 tasks: 09.11 (calendar MCP server), 09.12 (attendee-aware approval), 09.13 (conflict detection), 09.14 (ICS import/export), 09.15 (partial provider failure), 09.16 (Calendar page), 09.17 (lab 6), 09.18 (three-pane Inbox page).

No commit made (commit decision belongs to the owner).
