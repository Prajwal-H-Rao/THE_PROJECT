"""Base parser class and common utilities."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from nova.services.document_service.schemas import ParserSettings
from nova.services.document_service.schemas.extraction import (
    Confidence,
    FieldExtraction,
    ParsedDocument,
    ParsedDocumentMetadata,
    ReviewStatus,
    SourceSpan,
)


@dataclass
class ParseResult:
    """Result of a parse operation."""
    document: ParsedDocument
    warnings: list[str]


class BaseParser(ABC):
    """Abstract base parser for document formats."""

    def __init__(self, settings: ParserSettings):
        self.settings = settings
        self.parser_version = self.__class__.__name__.lower().replace("parser", "")
        self.warnings: list[str] = []

    @abstractmethod
    def parse(self, file_path: Path, mime_type: str) -> ParseResult:
        """Parse a file and return a ParsedDocument."""
        pass

    def _create_metadata(
        self,
        document_id: str,
        original_filename: str,
        mime_type: str,
        file_size: int,
        sha256: str,
        page_count: int | None = None,
    ) -> ParsedDocumentMetadata:
        """Create document metadata."""
        return ParsedDocumentMetadata(
            document_id=document_id,
            original_filename=original_filename,
            mime_type=mime_type,
            file_size=file_size,
            sha256=sha256,
            page_count=page_count,
            parser_version=self.parser_version,
            parsed_at=datetime.utcnow(),
            processing_time_ms=0,  # Will be updated by caller
        )

    def _create_field(
        self,
        field_name: str,
        value: Any,
        source_ref: SourceSpan | None = None,
        confidence: Confidence | None = None,
        review_status: ReviewStatus = ReviewStatus.PENDING,
        metadata: dict[str, Any] | None = None,
    ) -> FieldExtraction:
        """Create a field extraction with defaults."""
        return FieldExtraction(
            field_name=field_name,
            value=value,
            source_ref=source_ref,
            confidence=confidence,
            review_status=review_status,
            parser_version=self.parser_version,
            extraction_timestamp=datetime.utcnow(),
            metadata=metadata or {},
        )

    def _create_source_span(
        self,
        page: int | None = None,
        line: int | None = None,
        column: int | None = None,
        char_start: int | None = None,
        char_end: int | None = None,
        bbox: tuple[float, float, float, float] | None = None,
        raw_text: str | None = None,
    ) -> SourceSpan:
        """Create a source span."""
        return SourceSpan(
            page=page,
            line=line,
            column=column,
            char_start=char_start,
            char_end=char_end,
            bbox=bbox,
            raw_text=raw_text,
        )

    def _add_warning(self, warning: str) -> None:
        """Add a warning to the parser's warning list."""
        self.warnings.append(warning)