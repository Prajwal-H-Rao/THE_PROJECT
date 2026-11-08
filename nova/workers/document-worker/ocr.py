"""OCR fallback for the document worker (task 06.9).

OCR runs only as an isolated fallback when native text extraction yields
insufficient text. Low confidence surfaces as review_status instead of being
hidden. The OCR engine is injected as a callable; nothing non-stdlib is
imported at module load so this module is importable without pytesseract or
tesseract installed (they arrive in the worker image at task 06.10).

ReviewStatus.NEEDS_REVIEW ("needs_review") matches
nova/services/document-service/schemas/extraction.py:18.
"""

from dataclasses import dataclass

LOW_CONFIDENCE_THRESHOLD = 0.7


@dataclass
class OCRResult:
    """Result of an OCR fallback run."""

    text: str
    confidence: float
    source_span: str | None = None
    review_status: str = "ok"


def native_text_insufficient(text: str | None, min_chars: int = 20) -> bool:
    """Return True when native text is too sparse to trust (fallback gate)."""
    return not text or len(text.strip()) < min_chars


def ocr_fallback(
    image_bytes: bytes,
    engine,
    min_confidence: float = LOW_CONFIDENCE_THRESHOLD,
) -> OCRResult:
    """Run OCR through the injected engine; low confidence -> review_status.

    The engine must return a mapping with "text" and "confidence" keys.
    review_status is "needs_review" when confidence < min_confidence, else "ok".
    """
    result = engine(image_bytes) if engine else {}
    text = str(result.get("text", ""))
    confidence = float(result.get("confidence", 0.0))
    review_status = "needs_review" if confidence < min_confidence else "ok"
    return OCRResult(
        text=text,
        confidence=confidence,
        review_status=review_status,
    )
