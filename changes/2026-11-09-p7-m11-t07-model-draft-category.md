# Change — 2026-11-09-p7-m11-t07-model-draft-category

## Problem

Task 11.7 (module 11, P7): add the model-drafted category path with confidence and reason.
Artifact `services/finance-service/categoriser/` + `services/model-gateway/`.
Acceptance: "Low confidence forces review."

## Constraints honored

- Spec:826 — deterministic arithmetic: same draft always yields the same
  classification result; models summarize but cannot be the source of truth.
- Spec:741 — isolated import/parser: pure TypeScript/Python, no pg/DB,
  no bank credentials in model prompts.
- Spec:190 — finance family: categorize only; no movement of money.

## Changes

- `nova/services/finance-service/src/categoriser/model-draft.ts` (pure TypeScript):
  - `ModelCategoryDraft { category, confidence (0-1), reason, modelId }` —
    a category suggested by the model-gateway.
  - `ModelClassificationResult { category, confidence, reason, modelId,
    reviewStatus }` where `reviewStatus = NEEDS_REVIEW if confidence <
    threshold else REVIEWED` — low confidence forces review.
  - `classifyWithModel(draft, reviewThreshold=0.8)` — deterministic.
  - `draftToInput(draft, result, ...)` → `CreateFinanceTransactionInput`
    carrying `categoryConfidence`/`categoryConfidenceReason`.
- `nova/services/finance-service/src/categoriser/model-draft.test.ts` —
  5 tests, all pass: high confidence → REVIEWED, low confidence →
  NEEDS_REVIEW (forces review), boundary exactly at threshold → REVIEWED,
  determinism, draft-to-input mapping.
- `nova/services/model-gateway/category_suggester.py` (pure Python,
  no flask import): `suggest_category(merchant, description, model_id)`
  → `{category, confidence, reason}` — deterministic, testable with
  stdlib only.
- 12/12 categoriser tests pass (7 original + 5 new). `tsc --noEmit`
  clean for categoriser files.
- Layout: `src/categoriser/` already existed (task 11.6); `src/model-gateway/`
  `category_suggester.py` added to an existing directory — no directory/leaf
  count change (199/125/43 unchanged).

## Records

- worklist-p7-p11.md: 11.7 ticked.
- status.md: module 11 Done 7→8/Open 10→9 (Partial stays 1); P7 Done 7→8/
  Open 10→9 (33%→44%); Total Done 247→248/Open 141→140 (61%;
  248+15+140=403).

## Notes

No commit made.
