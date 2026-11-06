# 2026-11-04 — P8 task 2: employer registry count validation

## Problem

P8 module 13 task 2 requires the employer registry CSV importer to enforce exactly 500 rows: 250 IN plus 250 GLOBAL, unique normalized_name. The importer from task 1 only validated the header; count validation was missing.

## Changes

- `nova/services/employer-registry-service/src/validate.ts` — new file (no new directory), exports `validateCounts(rows: EmployerCsvRow[]): void` checking:
  - `rows.length === 500` (499 or 501 rows fail)
  - exactly 250 rows with `region === "IN"` (case-sensitive)
  - exactly 250 rows with `region === "GLOBAL"` (case-sensitive)
  - all `normalized_name` values unique (`Set.size === rows.length`)
  Throws descriptive errors on any violation. Explicit TypeScript types, no `any`, under 200 lines.
- `nova/services/employer-registry-service/src/csv-importer.ts` — imports `validateCounts` from `"./validate.js"`, calls `validateCounts(result)` unconditionally before `return` in `importCsv`, adds `validateCounts` to the export. Total 184 lines — under 200.
- `nova/services/employer-registry-service/src/csv-importer.test.ts` — existing valid-CSV test now generates 500 valid rows (250 IN + 250 GLOBAL, unique normalized_name) and asserts success through `importCsv`. New failure tests: 499 rows, 501 rows, wrong IN/GLOBAL split, duplicate normalized_name. Total 164 lines — under 200.

## Verification

- `python3 nova/tests/layout/check_layout.py` → exit 0, all 28 checks pass, tree counts unchanged (182/112/43 — no new directories).
- `python3 nova/tests/layout/test_layout_checks.py` → exit 0, every mutation rejected.
- Both negators returned SOUND before implementation.

## Notes

- The existing single-row success test was updated to generate 500 valid rows programmatically rather than listing all 500 rows inline.
- Header validation tests still run before `validateCounts` (header check at `validateHeader(rows[0])` precedes count check), so missing/renamed column tests still pass.
- `tsc` build and `node --test` cannot run locally (no `node_modules`) but are verified syntactically.
