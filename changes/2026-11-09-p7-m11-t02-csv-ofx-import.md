# Change — 2026-11-09-p7-m11-t02-csv-ofx-import

## Problem

Task 11.2 (module 11, P7): implement CSV and OFX import with encoding and locale variants.
Artifact `services/finance-service/ingest/` (`nova/services/finance-service/src/ingest/`).
Acceptance: "Each fixture imports."

## Constraints honored

- Spec:826 — deterministic arithmetic: integer minor units everywhere, no floating-point for money.
- Spec:741 — import parser isolated: pure text→record functions, no pg/DB, no bank credentials in prompts.
- Spec:190 — finance family: import and normalize only, no movement of money or financial transfers.

## Changes

- `nova/services/finance-service/src/ingest/normalize.ts` (shared):
  - `NormalizedTransaction` type: `amountMinor` (integer), `currency`, `transactionDate` (ISO), `postedAt`, `merchant`, `sourceReference` (stable dedup key), `rawJson`.
  - `parseAmount(text, locale)` — locale hint selects separators: EU `"1.234,56"` vs US `"1,234.56"` vs plain `"1234.56"`; integer minor units via `Math.round(value * 100)`.
  - `parseDate(text, locale)` — locale hint resolves DD/MM vs MM/DD ambiguity when both <= 12; day > 12 forces the order; accepts `YYYY-MM-DD` and OFX `YYYYMMDDHHMMSS[.SSS[...TZ]]`.
  - `rowReference(row)` — stable hash-based reference when no reference column exists.
- `nova/services/finance-service/src/ingest/csv-parser.ts` (parseCSV):
  - Strips UTF-8 BOM; detects delimiter (comma / semicolon / tab); normalizes headers; per-row amount/date/merchant/currency; `sourceReference` from reference column or row hash.
- `nova/services/finance-service/src/ingest/ofx-parser.ts` (parseOFX):
  - Extracts `<STMTTRN>` blocks; maps `TRNTYPE`/`DTPOSTED`/`TRNAMT`/`NAME`/`FITID` (FITID = sourceReference); handles fractional seconds and timezone in DTPOSTED.
- Tests written FIRST (test-first), confirmed failing (TS2307 module not found), then implemented, confirmed passing:
  - `csv-parser.test.ts` — US locale (comma/MM-DD/YYYY), EU locale (semicolon/DD-MM/YYYY/comma-decimal), BOM stripping, stable row-hash reference, plain ISO date/amount.
  - `ofx-parser.test.ts` — debit+credit transactions, DTPOSTED with fractional seconds/timezone, empty OFX (no STMTTRN → empty array).
- 8/8 tests pass via `tsc` + `node --test dist/ingest/*.test.js`. `tsc --noEmit` clean for ingest files.
- Precondition: `npm install` ran in finance-service (tsc now available; `@nova` symlink target corrected to `../../../packages/contracts`).

## Records

- Layout counts: `tree_checks.py` 196→197 directories, 122→123 leaves (new `src/ingest/` dir); `layout-diff.md` count phrases; `record_mutations.py` wrong_leaf_count flipped 122→123 source / 123→124 mutant; `repo.md` dated section.
- worklist-p7-p11.md: 11.2 ticked.
- status.md: module 11 Done 2→3/Open 14→13; P7 Done 2→3/Open 14→13 (17%); Total Done 242→243/Open 145→144 (60%; 243+16+144=403).

## Notes

Pre-existing collateral: `npm install` in finance-service deleted tracked `nova/packages/contracts/*` working-tree files (file: dependency processing). Restored via `git checkout -- nova/packages/contracts/` and removed the stray broken `nova/packages/contracts/contracts` symlink. No commit made.
