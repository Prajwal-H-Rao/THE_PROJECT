# Change — 2026-11-06-p3-m06-t14-bad-fixture-corpus

## Problem

Task 06.14 (module 06, P3): add a bad-fixture corpus; each fixture fails safely. Acceptance tests `test_encrypted_pdf_rejected` and `test_oversized_upload_rejected` (module file). pytest/flask/pydantic not installed locally; stdlib-only `python3` tests are the approved pattern (tasks 06.3, 06.12).

## Changes (test-first)

- Wrote `nova/services/document-service/ingest/fixture_rules.py`: pure-stdlib byte-level rejection rules — `reject_encrypted_pdf` (scans `/Encrypt` in the last 4 KB trailer window), `reject_invalid_magic` (PDF/DOCX/TXT/CSV magic bytes), `reject_oversized` (size vs limit), `reject_beyond_page_limit` (`/Type /Page` markers excluding `/Pages`, vs `max_pages`). Module header documents residual limits.
- Wrote `nova/tests/fixtures/manifest.json` declaring corpus entries: encrypted.pdf, invalid-magic.pdf, scanned-beyond-limit.pdf (501 page markers), oversized.pdf (runtime-generated).
- Generated corpus files in `nova/tests/fixtures/`: `encrypted.pdf` (%PDF- prefix, /Encrypt trailer, <500 pages), `invalid-magic.pdf` (no %PDF- prefix), `scanned-beyond-limit.pdf` (%PDF- prefix, 501 /Type /Page markers). No multi-MB oversized file committed; the test builds it at runtime.
- Wrote `nova/tests/fixtures/test_bad_fixtures.py`: stdlib-only test; each corpus fixture fails safely with the expected typed reason, no crash; asserts `quarantine.py` wires fixture_rules and `schemas/settings.py` pins `max_pages` to 500. Test-first confirmed: initial run failed at `test_quarantine_wires_fixture_rules` (wiring absent), then passed after wiring.
- Refactored `nova/services/document-service/ingest/quarantine.py` `validate_file()` to call `reject_encrypted_pdf` and `reject_beyond_page_limit` after the magic check (signature unchanged: `validate_file(file_bytes, filename, settings)` still raises `ValidationError`).

## Behavior delta (explicitly noted)

The request path now additionally rejects encrypted PDFs and page-limit-exceeding PDFs at ingest — previously only size, extension, MIME and magic were enforced. Size check already covers oversized, so extension/MIME/text-decode remain in quarantine.py reading `QuarantineSettings`; byte-level rules live in fixture_rules.py. This split is documented. Page enforcement at ingress is best-effort (byte scan); the PyMuPDF parser path enforces pages deterministically in task 06.5. Therefore 06.14 stays marked "(partial)" per the negators' correction #4: the encoder/page rules live here, but full best-effort-to-deterministic coverage completes at task 06.5 / 06.16 (parser side).

## Verification

- `python3 nova/tests/fixtures/test_bad_fixtures.py` → PASS (all acceptance checks).
- `python3 nova/tests/layout/check_layout.py` → all 28 checks pass (A–AB). Tree counts unchanged: 180 directories, 111 leaf directories, 43 placeholders. `tests/fixtures/` is an owned path (plan 03 task 15, plan 05 task 14); no registration change needed; no new directory added.
- Negator corrections applied: `/Page`-not-`/Pages` lookahead regex; manifest-declared page limit pinned via text-grep of settings.py; fixture byte constraints (%PDF- prefix on encrypted and scanned fixtures; ≤500 page objects in the encrypted fixture); behavior delta stated explicitly.

Task 06.14 marked done; checkbox ticked in `docs/plan/worklist.md`. Module 06 now 15 done / 1 partial / 5 open; P3 now 31 done / 1 partial / 5 open (84%); totals 219 done / 19 partial / 165 open (54%). Partial status retained per negator #4 (deterministic page enforcement lands at 06.5 / 06.16).

No commit made (commit decision belongs to the owner).
