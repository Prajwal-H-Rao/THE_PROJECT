# Change — 2026-11-09-p7-m11-t03-pdf-statement

## Problem

Task 11.3 (module 11, P7): implement PDF statement parsing through the sandboxed document service. Artifact `services/finance-service/ingest/` (`nova/services/finance-service/src/ingest/statement.ts`). Acceptance: "Rows keep row and column refs."

## Constraints honored

- Spec:826 — deterministic arithmetic: integer minor units everywhere, no floating-point for money.
- Spec:741 — import parser isolated: no pg/DB, no bank credentials in prompts.
- Spec:190 — finance family: import and normalize only, no movement of money.

## Changes

- `nova/services/finance-service/src/ingest/statement.ts` (pure function):
  - `importParsedStatement(parsedDocument, userId)` consumes a parsed document produced by the document service's PDF parser (pdf_parser.py) and maps its fields to `CreateFinanceTransactionInput[]`.
  - Fields are grouped into rows by page+line from their `source_ref`, so each statement row becomes one finance transaction.
  - `sourceReference` keeps the row ref (page:line:column:bbox) — deterministic, dedup-friendly (ties to task 11.4).
  - `rawJson` keeps the column refs (page, line, column, bbox, raw_text) for every field in the row — each row traces back to its exact source location.
  - `amountMinor` via integer minor units (`Math.round(value * 100)`); `currency`, `transactionDate`, `merchant` parsed from field values.
- `nova/services/finance-service/src/ingest/statement.test.ts` (test-first, confirmed failing then passing): 4 tests — row/column refs kept, integer minor units, empty document → empty transactions, stable sourceReference across re-import.
- 8/8 ingest tests pass (5 CSV + 3 OFX from task 11.2 + 4 statement); `tsc --noEmit` clean for ingest files.
- `src/ingest/` already existed (task 11.2), so no new directory — layout counts unchanged at 197/123/43.

## Records

- worklist-p7-p11.md: 11.3 ticked.
- status.md: module 11 Done 3→4/Open 13→12; P7 Done 3→4/Open 13→12 (22%); Total Done 243→244/Open 144→143 (61%; 244+16+143=403).

## Notes

The document service itself (Python, pdf_parser.py) already performs the PDF parsing and produces `source_ref` with page/line/column/bbox per field. This change adds the finance-side consumer that keeps those row/column refs on every imported row. The document-service HTTP call is not implemented here (document service not runnable in this environment — Python stdlib only, no fitz/pytest/pip); the pure mapping function is the testable deliverable.

No commit made.
