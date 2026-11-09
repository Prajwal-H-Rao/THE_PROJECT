# Change — 2026-11-09-p7-m11-t05-currency-conversion

## Problem

Task 11.5 (module 11, P7): implement deterministic currency conversion with a dated rate table.
Artifact `services/finance-service/currency/` (`nova/services/finance-service/src/currency/`).
Acceptance: "Rounding cases pass."

## Constraints honored

- Spec:826 — deterministic arithmetic: integer minor units only, no floating-point for money; models may summarize but cannot be the source of truth.
- Spec:741 — isolated import/parser: pure TypeScript, no pg/DB, no bank credentials.
- Spec:190 — finance family: import/normalize/categorize/budget/summarize; no movement of money.

## Changes

- `nova/services/finance-service/src/currency/rates.ts` — `RateTable` class:
  - `addRate(from, to, effectiveDate, numerator, denominator)` — registers a rate effective from a date.
  - `getRate(from, to, date)` — returns the rate with the most recent effectiveDate on-or-before the query date, or null when none exists.
- `nova/services/finance-service/src/currency/converter.ts` — `convert(amountMinor, fromCurrency, toCurrency, date, rateTable)` → `{ convertedAmountMinor, rateUsed, effectiveDate }`:
  - Integer-only math; round half up away from zero via `floor((2*abs*num + den) / (2*den))`.
  - Same currency → identity 1:1 without a rate lookup.
  - No rate on-or-before date → throws.
- `nova/services/finance-service/src/currency/converter.test.ts` — 6 tests, all pass:
  - rate selection on-or-before (0.90 before 2026-06-01, 0.85 after)
  - same-currency identity 1:1
  - round half up (1/3 → 33 minor units)
  - round half up on exact half (1/2 → 50 minor units)
  - no rate for pair → throws
  - no effective rate on-or-before date → throws
- 25/25 finance-service tests pass (21 prior + 6 currency converter). `tsc --noEmit` clean for currency files.
- Layout: new `src/currency/` dir → 197→198 directories, 123→124 leaves; updated tree_checks.py, layout-diff.md count phrases, record_mutations.py wrong_leaf_count (124→125 mutant), repo.md dated section.

## Records

- worklist-p7-p11.md: 11.5 ticked.
- status.md: module 11 Done 5→6/Open 12→11 (Partial stays 1); P7 Done 5→6/Open 12→11 (22%→33%); Total Done 245→246/Open 143→142 (61%; 246+15+142=403).

## Notes

Round-half-up uses floor((2*abs*num + den) / (2*den)) — deterministic, integer-only, works for both positive and negative amounts (sign applied after rounding magnitude). No commit made.
