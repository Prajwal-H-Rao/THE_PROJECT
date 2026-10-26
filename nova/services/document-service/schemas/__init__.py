"""Pydantic v2 contracts for the document service."""

from .extraction import (
    Confidence,
    ExtractionEnvelope,
    FieldExtraction,
    ParsedDocument,
    ParsedDocumentMetadata,
    ReviewStatus,
    SourceSpan,
)
from .settings import DocumentServiceSettings, ParserSettings, QuarantineSettings, WorkerSettings

__all__ = [
    "Confidence",
    "ExtractionEnvelope",
    "FieldExtraction",
    "ParsedDocument",
    "ParsedDocumentMetadata",
    "ReviewStatus",
    "SourceSpan",
    "DocumentServiceSettings",
    "ParserSettings",
    "QuarantineSettings",
    "WorkerSettings",
]