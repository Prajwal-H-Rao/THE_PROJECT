# Change — 2026-11-06-p3-m06-t17-citation-validator

## Problem

Task 06.17 (module 06, P3): reject citation IDs that do not resolve to a stored span. Artifact: validator. Acceptance test `test_fabricated_citation_rejected` — an invented document ID fails validation. Spec:824 — citation IDs must resolve to fetched source records and source spans. pydantic/minio not installed locally; stdlib-only `python3` test is the approved pattern.

## Changes (test-first)

- Wrote `nova/tests/fixtures/test_citation_validator.py` first: stdlib test asserting `validate_citation` raises `CitationError` for a fabricated citation ID, `resolve_citation` rejects unknown IDs, valid IDs resolve to stored spans. Test-first confirmed: initial run failed with `ModuleNotFoundError: No module named 'validator'`; passed after writing validator.py.
- Wrote `nova/services/document-service/validator.py`: pure-stdlib citation validator. `CitationError(Exception)` raised when a citation ID cannot be resolved; `validate_citation(citation_id, valid_ids)` returns the id when valid else raises `CitationError`; `resolve_citation(citation_id, spans)` returns the stored span dict else raises `CitationError`. Works on plain dicts (no pydantic) so importable with plain python3.

## Verification

- `python3 nova/tests/fixtures/test_citation_validator.py` → PASS (all four checks).
- `python3 nova/tests/layout/check_layout.py` → all 28 checks pass (A–AB). Tree counts unchanged: 180 directories, 111 leaf directories, 43 placeholders. `services/document-service` is an extra path prefix (task 06.3); `tests/fixtures/` is owned (plan 03 task 15, plan 05 task 14); no registration change needed.

## Notes

Task 06.17 marked done; checkbox ticked in `docs/plan/worklist.md`. Module 06 now 19 done / 1 partial / 1 open; P3 now 35 done / 1 partial / 1 open (95%); totals 223 done / 19 partial / 161 open (55%). Partial retained because 06.14 remains partial (deterministic page enforcement lands at 06.5/06.16 parser side).

Remaining P3 tasks top-to-bottom: 06.18 (malware scan), 06.21 (skills/experience extraction).

No commit made (commit decision belongs to the owner).
