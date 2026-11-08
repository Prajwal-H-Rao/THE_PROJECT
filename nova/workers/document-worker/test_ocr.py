"""Test for task 06.9: OCR as an isolated fallback; low confidence surfaced as review.

stdlib-only: imports ocr.py (pure stdlib, no pytesseract/tesseract at load)
and drives it with fake engines. Runs with plain python3 from this directory.
"""

from ocr import (
    LOW_CONFIDENCE_THRESHOLD,
    OCRResult,
    native_text_insufficient,
    ocr_fallback,
)


def test_low_confidence_surfaces_review() -> None:
    """OCR below threshold sets review_status to needs_review (acceptance test)."""
    engine = lambda image_bytes: {"text": "fuzzy text", "confidence": 0.3}
    result = ocr_fallback(b"image", engine)
    assert result.review_status == "needs_review", result
    assert result.confidence < LOW_CONFIDENCE_THRESHOLD


def test_high_confidence_not_reviewed() -> None:
    """OCR at or above threshold keeps review_status ok."""
    engine = lambda image_bytes: {"text": "clear text", "confidence": 0.9}
    result = ocr_fallback(b"image", engine)
    assert result.review_status == "ok", result
    assert result.confidence >= LOW_CONFIDENCE_THRESHOLD


def test_native_text_insufficient_gate() -> None:
    """Empty or short native text triggers the OCR fallback gate."""
    assert native_text_insufficient(None) is True
    assert native_text_insufficient("") is True
    assert native_text_insufficient("   ") is True
    assert native_text_insufficient("short", min_chars=20) is True
    assert native_text_insufficient("enough native text here", min_chars=20) is False


def test_ocr_result_defaults_ok() -> None:
    """An OCRResult defaults review_status to ok when confidence is high."""
    result = OCRResult(text="x", confidence=1.0)
    assert result.review_status == "ok"


if __name__ == "__main__":
    test_low_confidence_surfaces_review()
    test_high_confidence_not_reviewed()
    test_native_text_insufficient_gate()
    test_ocr_result_defaults_ok()
    print("PASS test_ocr: low confidence surfaced as review; fallback gate works")
