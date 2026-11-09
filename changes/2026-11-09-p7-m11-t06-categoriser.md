# Change — 2026-11-09-p7-m11-t06-categoriser

## Problem

Task 11.6 (module 11, P7): build the rule-based categoriser with override history.
Artifact `services/finance-service/categoriser/` (`nova/services/finance-service/src/categoriser/`).
Acceptance test: "Rules are deterministic".

## Constraints honored

- Spec:826 — deterministic arithmetic: same input always yields the same
  category; no floating-point for money (amounts stay integer minor units).
- Spec:741 — isolated import/parser: pure TypeScript, no pg/DB, no bank
  credentials.
- Spec:190 — finance family: categorize only; no movement of money.

## Changes

- `nova/services/finance-service/src/categoriser/rules.ts` — `Categoriser`
  class:
  - `addRule(id, pattern, category, priority)` — registers a rule.
  - `categorise(merchant, amountMinor, currency)` →
    `{ category, matchedRuleId }`.
  - Rules ordered by priority (descending) then insertion order (ascending,
    stable); first match wins. No match → `"uncategorised"` with a null id.
  - Merchant matching is case-insensitive; patterns may be exact (wrapped in
    `/.../`) or substring.
- `nova/services/finance-service/src/categoriser/override.ts` —
  `OverrideHistory` class:
  - `recordOverride(transactionId, oldCategory, newCategory, reason)` —
    records an applied override with a UTC timestamp.
  - `getOverrideHistory(transactionId)` → list of override records, empty
    for unknown transactions.
- `nova/services/finance-service/src/categoriser/categoriser.test.ts` — 7
  tests, all pass: uncategorised default, priority wins, insertion-order
  tiebreak, case-insensitive matching, determinism, override recording and
  retrieval, empty history for unknown transaction.
- 28/28 finance-service tests pass (21 prior + 7 categoriser). `tsc
  --noEmit` clean for categoriser files.
- Layout: new `src/categoriser/` dir → 198→199 directories, 124→125 leaves;
  updated tree_checks.py, layout-diff.md count phrases,
  record_mutations.py wrong_leaf_count (125→126 mutant), repo.md dated
  section.

## Records

- worklist-p7-p11.md: 11.6 ticked.
- status.md: module 11 Done 6→7/Open 11→10 (Partial stays 1); P7 Done 6→7/
  Open 11→10 (33%→39%); Total Done 246→247/Open 142→141 (61%;
  247+15+141=403).

## Notes

No commit made.
