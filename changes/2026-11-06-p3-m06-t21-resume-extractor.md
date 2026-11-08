# Change — 2026-11-06-p3-m06-t21-resume-extractor

## Problem

Task 06.21 (module 06, P3): run the NLP extraction step over parsed text — skills and experience, each carrying the source span it came from. Artifact: `services/ml-service/resume/`. Acceptance: every extracted skill resolves to a stored span, and an unsupported field stays unknown (spec:226, spec:523). pydantic/flask/minio not installed locally; stdlib-only `python3` test is the approved pattern.

## Changes (test-first)

- Wrote `nova/tests/fixtures/test_resume_extractor.py` first: stdlib test loading `extractor.py` by file path (the parent `ml-service/__init__.py` imports flask/pydantic which are not installed, so package import is impossible). Asserts every extracted skill resolves to a stored span, unsupported field stays unknown, experience entries carry source spans. Test-first confirmed: initial run failed with `FileNotFoundError` (extractor.py absent); passed after writing extractor.py.
- Wrote `nova/services/ml-service/resume/__init__.py` (package marker, docstring).
- Wrote `nova/services/ml-service/resume/extractor.py`: pure-stdlib extractor. `extract_skills(text)` keyword-scans skills with `source_span {char_start, char_end}`; `extract_experience(text)` regex-parses role/employer/date clusters with spans; `resolve_span(source_span, stored_spans)` checks a char range falls within a stored span; `unknown_field(field_name)` returns state "unknown". No pydantic/flask/minio/subprocess/socket at import — importable with plain python3.
- Layout registration (new `resume/` directory adds +1 directory / +1 leaf):
  - `tree_checks.py`: `services/ml-service` added to `EXTRA_DIRECTORY_PREFIXES` (sorted between `services/messages-service` and `services/release-gate-service`); `EXPECTED_DIRECTORIES` 180→181; `EXPECTED_LEAVES` 111→112.
  - `layout-diff.md`: allow-list sentence gains `services/ml-service` (same sorted position); all count phrases updated 180→181 directories, 111→112 leaves (lines 5, 37, 59, 61, 65).
- Test passes; check_layout all 28 pass with 181 directories / 112 leaves / 43 placeholders.

## Verification

- `python3 nova/tests/fixtures/test_resume_extractor.py` → PASS (all three acceptance checks).
- `python3 nova/tests/layout/check_layout.py` → all 28 checks pass (A–AB).

## Notes

Task 06.21 marked done; checkbox ticked in `docs/plan/worklist.md`. Module 06 now 21 done / 0 partial / 0 open = Complete; P3 now 37 done / 0 partial / 0 open = 100%; totals 225 done / 18 partial / 160 open (56%). P3 is fully complete. Total partial (18) is held by task 02.13 (P1, blocked — no Postgres).

Remaining P1/P2 items: 02.13 (blocked, needs Postgres target) and P2 exit confirmation (suites already pass).

No commit made (commit decision belongs to the owner).
