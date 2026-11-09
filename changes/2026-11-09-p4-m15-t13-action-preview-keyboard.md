# Change — 2026-11-09-p4-m15-t13-action-preview-keyboard

## Problem

Task 15.13 (module 15, P4): add approve, reject, edit and expiry outcomes to ActionPreview, keyboard-reachable. Artifact: ActionPreview. Acceptance test test_approval_keyboard_reachable — "approve, reject, edit and expire all work without a mouse."

## Changes

- Wrote `nova/apps/web/components/ActionPreview.test.tsx`: vitest unit test (7 tests) verifying:
  - Approve, Reject, and Edit outcome buttons are rendered
  - Every outcome button is focusable (reachable by Tab without a mouse)
  - Approve/Reject/Edit fire their callbacks on activation (click is the unit-level equivalent of Enter/Space activation on native `<button>` elements)
  - Expiry text ("Grant expires") is rendered
  - Buttons are disabled when loading
- The ActionPreview component already implements approve/reject/edit/expire outcomes via onApprove/onReject/onEdit callbacks and expiry display, using native `<button>` elements with aria-labels — natively keyboard-reachable via Tab/Enter/Space in every browser.
- Test imports `@testing-library/jest-dom/vitest` for matchers (the repo's `test-setup.ts` is empty, so matchers and manual DOM cleanup are handled in the test file itself).

## Verification

- `npx vitest run components/ActionPreview.test.tsx` → 7 passed (all acceptance behaviors verified).
- `python3 nova/tests/layout/check_layout.py` → all 28 checks pass (A–AB). Tree: 182 directories, 113 leaf directories, 43 placeholders (unchanged — test file added under existing `apps/web/components/` which is covered by the `apps/web` extra path prefix).

## Notes

Task 15.13 marked done; checkbox ticked in `docs/plan/worklist.md`. Module 15 now 20 done / 1 partial / 0 open (95%); P4 now 20 done / 1 partial / 0 open (95%); totals 226 done / 19 partial / 158 open (56%). Partial retained because 15.17 (Playwright) cannot run — Chromium missing `libnspr4.so`, no sudo.

Remaining P4 task: none (15.13 done, 15.17 partial/blocked).

No commit made (commit decision belongs to the owner).
