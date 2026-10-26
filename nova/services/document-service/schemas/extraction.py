"""Extraction envelope contracts for parsed documents."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ReviewStatus(str, Enum):
    """Review status for extracted fields."""

    PENDING = "pending"
    REVIEWED = "reviewed"
    NEEDS_REVIEW = "needs_review"
    UNKNOWN = "unknown"


class Confidence(BaseModel):
    """Confidence score with metadata."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    value: float = Field(ge=0.0, le=1.0, description="Confidence score 0-1")
    method: Literal["parser", "model", "ocr", "deterministic"] = Field(
        description="How confidence was determined"
    )
    threshold: float | None = Field(default=None, ge=0.0, le=1.0, description="Threshold for review")


class SourceSpan(BaseModel):
    """Source location in the original document."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    page: int | None = Field(default=None, ge=1, description="Page number (1-indexed)")
    line: int | None = Field(default=None, ge=1, description="Line number (1-indexed)")
    column: int | None = Field(default=None, ge=1, description="Column number (1-indexed)")
    char_start: int | None = Field(default=None, ge=0, description="Character start offset")
    char_end: int | None = Field(default=None, ge=0, description="Character end offset")
    bbox: tuple[float, float, float, float] | None = Field(
        default=None, description="Bounding box (x0, y0, x1, y1) in points"
    )
    raw_text: str | None = Field(default=None, description="Raw text from source")


class FieldExtraction(BaseModel):
    """A single extracted field with provenance."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    field_name: str = Field(min_length=1, description="Name of the extracted field")
    value: Any = Field(description="Extracted value")
    source_ref: SourceSpan | None = Field(default=None, description="Source location in document")
    confidence: Confidence | None = Field(default=None, description="Confidence score")
    review_status: ReviewStatus = Field(default=ReviewStatus.PENDING, description="Review status")
    parser_version: str = Field(description="Parser or model version that extracted this field")
    model_version: str | None = Field(default=None, description="Model version if extracted by model")
    extraction_timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

    @field_validator("source_ref", mode="before")
    @classmethod
    def _validate_source_ref(cls, v: Any) -> SourceSpan | None:
        if v is None:
            return None
        if isinstance(v, dict):
            return SourceSpan(**v)
        return v


class ParsedDocumentMetadata(BaseModel):
    """Metadata about the parsed document."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    document_id: UUID = Field(description="Content-addressed document ID")
    original_filename: str = Field(description="Original filename")
    mime_type: str = Field(description="MIME type")
    file_size: int = Field(ge=0, description="File size in bytes")
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$", description="SHA-256 hash")
    page_count: int | None = Field(default=None, ge=0, description="Number of pages")
    parser_version: str = Field(description="Parser version used")
    parsed_at: datetime = Field(default_factory=datetime.utcnow)
    processing_time_ms: int = Field(ge=0, description="Processing time in milliseconds")


class ParsedDocument(BaseModel):
    """Complete parsed document with extraction envelope."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    metadata: ParsedDocumentMetadata
    fields: list[FieldExtraction] = Field(default_factory=list, description="Extracted fields")
    raw_content: str | None = Field(default=None, description="Raw extracted text content")
    structure: dict[str, Any] | None = Field(
        default=None, description="Document structure (headings, tables, etc.)"
    )
    warnings: list[str] = Field(default_factory=list, description="Non-fatal parsing warnings")

    def get_field(self, name: str) -> FieldExtraction | None:
        """Get a field by name."""
        for field in self.fields:
            if field.field_name == name:
                return field
        return None

    def high_impact_fields(self) -> list[FieldExtraction]:
        """Return fields that are high-impact (degree, employer, dates, money, work auth)."""
        high_impact = {"degree", "employer", "dates", "money", "work_authorisation", "work_authorization"}
        return [f for f in self.fields if f.field_name.lower() in high_impact]

    def needs_review(self) -> bool:
        """Check if any field needs review."""
        return any(f.review_status == ReviewStatus.NEEDS_REVIEW for f in self.fields)


class ExtractionEnvelope(BaseModel):
    """Wrapper for the complete extraction result with object reference."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    object_ref: str = Field(description="Content-addressed object store reference")
    document: ParsedDocument
    envelope_version: str = Field(default="1.0", description="Envelope schema version")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    def to_storage_dict(self) -> dict[str, Any]:
        """Convert to dict for object store storage."""
        return {
            "envelope_version": self.envelope_version,
            "created_at": self.created_at.isoformat(),
            "document": self.document.model_dump(mode="json"),
        }

    @classmethod
    def from_storage_dict(cls, data: dict[str, Any], object_ref: str) -> ExtractionEnvelope:
        """Create from storage dict."""
        return cls(
            object_ref=object_ref,
            document=ParsedDocument(**data["document"]),
            envelope_version=data.get("envelope_version", "1.0"),
            created_at=datetime.fromisoformat(data["created_at"]),
        )
