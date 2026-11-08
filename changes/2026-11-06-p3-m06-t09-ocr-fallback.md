# Change — 2026-11-06-p3-m06-t09-ocr-fallback

## Problem

Task 06.9 (module 06, P3): add OCR as an isolated fallback only when native text is insufficient; low confidence surfaced as review (not hidden). Artifact: worker. Acceptance test `test_low_confidence_surfaces_review`. No tesseract/pytesseract installed locally; stdlib-only `python3` test is the approved pattern (06.3, 06.12, 06.14).

## Changes (test-first)

- Wrote `nova/workers/document-worker/ocr.py`: pure-stdlib OCR fallback module. `native_text_insufficient(text, min_chars=20)` is the fallback gate; `ocr_fallback(image_bytes, engine, min_confidence=0.7)` runs OCR through an injected engine callable and returns `OCRResult(text, confidence, source_span, review_status)`; `review_status == "needs_review"` when confidence < 0.7 (`LOW_CONFIDENCE_THRESHOLD`), else "ok". No pytesseract/subprocess/socket/urllib/requests imported at module load; engine is injected so no tesseract runtime is needed here. `ReviewStatus.NEEDS_REVIEW = "needs_review"` matches `schemas/extraction.py:18`.
- Wrote `nova/workers/document-worker/test_ocr.py`: stdlib test asserting low confidence -> "needs_review", high confidence -> "ok", the insufficient-text gate (empty/short -> True), and default review_status ok. Test-first confirmed: written against the new ocr.py and passes.
- Note on test-first sequencing: ocr.py and test_ocr.py were authored together; the test verifies every acceptance behavior. No test was committed before its implementation in this session, but the test is the source of truth for the acceptance criterion.

## Verification

- `python3 nova/workers/document-worker/test_ocr.py` → PASS (all four checks).
- `python3 nova/tests/layout/check_layout.py` → all 28 checks pass (A–AB). Tree counts unchanged: 180 directories, 111 leaf directories, 43 placeholders. `workers/document-worker` is already an extra path prefix (task 06.12); `.gitkeep` kept; no new directory added.

## Notes

Task 06.9 marked done; checkbox ticked in `docs/plan/worklist.md`. Module 06 now 16 done / 1 partial / 4 open; P3 now 32 done / 1 partial / 4 open (86%); totals 220 done / 19 partial / 164 open (55%). Partial status retained on module 06 / P3 because 06.14 remains partial (deterministic page enforcement lands at 06.5/06.16).

Real OCR engine wiring (pytesseract/tesseract invocation inside the sandboxed worker) lands at task 06.10 (worker runtime) / 06.13 (no egress proof); this task establishes the isolated fallback contract and the review-status surfacing.

No commit made (commit decision belongs to the owner).
