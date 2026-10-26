"""Pydantic v2 contracts for the document service."""

from .extraction import (
    ExtractionEnvelope,
    FieldExtraction,
    SourceSpan,
    Confidence,
    ReviewStatus,
    ParsedDocument,
    ParsedDocumentMetadata,
)
from .settings import DocumentServiceSettings, QuarantineSettings, ParserSettings, WorkerSettings

__all__ = [
    "ExtractionEnvelope",
    "FieldExtraction",
    "SourceSpan",
    "Confidence",
    "ReviewStatus",
    "ParsedDocument",
    "ParsedDocumentMetadata",
    "DocumentServiceSettings",
    "QuarantineSettings",
    "ParserSettings",
    "WorkerSettings",
]