# 2026-10-25 — Module 08 task 8 — approval card API

## Scope

Approval card API for chat display (Module 08 task 8, plan `docs/plan/08-policy-approval.md` task 8). Spec:778 — "the approval is bound to the payload hash, nonce and expiry", "the card hash binds the preview, and a preview edited after hashing fails".

## Decision (design note: `docs/design-notes/nova-approval-grants.md`)

- **Separate card hash**: `cardHash = computeApprovalHash(preview)` is separate from `payloadHash`. Preview is the EXACT object shown to user (not sanitized). Client verifies: `computeApprovalHash(displayedPreview) === cardHash`. Edit preview → hash mismatch.
- **Preview bounded**: max 10KB enforced at service layer (`MAX_PREVIEW_BYTES = 10KB`). Prevents DoS and limits PII exposure.
- **Permissions derivation**: `rule.allowedActions ?? [action]` (concrete fallback).
- **Consequence mapping**: complete riskTier × sensitivity table (16 combos, all covered).
- **Two nonce formats** (unchanged):
  - Decision endpoint: 16-char nonce (response token for polling)
  - Grants service: 32-char nonce (grant key, capability URL)
- **Card endpoint validates service**: `GET /policy/grants/:nonce/card?service=X` → validates `grant.service === service` (defense-in-depth).

## Implementation

### Migration

- `packages/contracts/migrations/25-approval-card.sql`: ALTER approvals ADD `preview JSONB`, `card_hash CHAR(64)`, `permissions JSONB`, `consequence TEXT`, `rule_id TEXT`. Existing grants get NULL preview → card endpoint returns 404 `{ error: "no_preview" }`.

### Service (`nova/services/policy-approval-service/src/approval/`)

- `grants.service.ts`:
  - `createGrantWithDetails(input)`: accepts `preview`, `permissions`, `consequence`, `ruleId`; enforces 10KB preview limit; computes `cardHash = computeApprovalHash(preview)`; stores all in `GrantRecord`.
  - `getGrantCard(nonce, service)`: validates 32-char nonce, service matches `grant.service`, preview exists; returns `{ target, preview, permissions, consequence, expiresAtMs, cardHash }` or null.
  - `GrantRecord` adds optional `preview`, `cardHash`, `permissions`, `consequence`, `ruleId`.
  - `MAX_PREVIEW_BYTES = 10KB` constant.
  - `derivePermissions(allowedActions, action)` = `allowedActions ?? [action]`.
  - `deriveConsequence(riskTier, sensitivity)` = complete 16-combo mapping table.

- `grants.controller.ts`:
  - `POST /policy/grants/with-details` → creates grant with card details (200/400).
  - `GET /policy/grants/:nonce/card?service=X` → 200 card, 404 (not found/service mismatch/no preview), 400 (invalid nonce/service).

- `grant-binding.ts`: `GrantRecord` adds optional `preview`, `cardHash`, `permissions`, `consequence`, `ruleId`.

### Tests (81 total, 7 new → 81)

- `create grant with details and get card verifies hash`: client computes `computeApprovalHash(preview)` matches `cardHash`.
- `edit preview locally causes hash mismatch`: edited preview hash ≠ `cardHash`.
- `card endpoint returns 404 for wrong service`: service mismatch → null (404).
- `card endpoint returns 404 for unknown nonce`.
- `card endpoint returns null for grant without preview` (old grants).
- `create grant with details validates preview size limit` (10KB).
- `create grant with details stores provided permissions and consequence`.

### Layout records

No changes (105/74/37 unchanged).

## Verification

- Contracts `npm test`: 55 pass, 0 fail.
- Policy service `npm test`: 81 pass, 0 fail (compiles through `nest build`, runs without DB).
- `python3 nova/tests/layout/check_layout.py`: all checks passed.

## Notes

- Decision endpoint (`POST /policy/decide`) unchanged — no breaking change. Returns 16-char nonce for polling.
- Client flow: `POST /policy/decide` → if `needs_approval`, `POST /policy/grants/with-details` with payload → `GET /policy/grants/:grantNonce/card?service=X` → display card.
- Two pre-existing `test_layout_checks.py` failures at HEAD are unrelated and unchanged.