"""PDF parser using PyMuPDF (fitz) with page and span provenance."""

import fitz  # PyMuPDF
from pathlib import Path

from nova.services.document_service.parser.base import BaseParser, ParseResult
from nova.services.document_service.schemas import ParserSettings
from nova.services.document_service.schemas.extraction import (
    Confidence,
    FieldExtraction,
    ParsedDocument,
    ParsedDocumentMetadata,
    ReviewStatus,
    SourceSpan,
)


class PDFParser(BaseParser):
    """PDF parser using PyMuPDF with full provenance tracking."""

    def __init__(self, settings: ParserSettings):
        super().__init__(settings)
        self.parser_version = f"pymupdf-{fitz.__version__}"

    def parse(self, file_path: Path, mime_type: str) -> ParseResult:
        """Parse a PDF file and extract text with page/span provenance."""
        self.warnings = []
        doc = fitz.open(file_path)

        try:
            page_count = doc.page_count
            fields = []
            raw_text_parts = []
            structure = {"pages": []}

            for page_num in range(page_count):
                page = doc[page_num]
                page_text = page.get_text("text")
                raw_text_parts.append(page_text)

                # Extract text blocks with bounding boxes
                blocks = page.get_text("dict")["blocks"]
                page_fields = []
                page_structure = {"page": page_num + 1, "blocks": []}

                for block in blocks:
                    if block["type"] == 0:  # Text block
                        block_text = ""
                        block_spans = []

                        for line in block["lines"]:
                            for span in line["spans"]:
                                span_text = span["text"]
                                block_text += span_text
                                block_spans.append({
                                    "text": span_text,
                                    "bbox": span["bbox"],
                                    "font": span["font"],
                                    "size": span["size"],
                                    "color": span["color"],
                                })

                        if block_text.strip():
                            # Create field for this text block
                            bbox = block["bbox"]
                            source_ref = SourceSpan(
                                page=page_num + 1,
                                char_start=len("".join(raw_text_parts)) - len(page_text),
                                char_end=len("".join(raw_text_parts)),
                                bbox=bbox,
                                raw_text=block_text.strip()[:500],  # Truncate for storage
                            )

                            field = self._create_field(
                                field_name=f"page_{page_num + 1}_block_{len(page_fields)}",
                                value=block_text.strip(),
                                source_ref=source_ref,
                                confidence=Confidence(
                                    value=1.0,
                                    method="parser",
                                    threshold=0.9,
                                ),
                                review_status=ReviewStatus.REVIEWED,
                                metadata={
                                    "block_bbox": bbox,
                                    "span_count": len(block_spans),
                                    "spans": block_spans[:10],  # Limit stored spans
                                },
                            )
                            page_fields.append(field)
                            page_structure["blocks"].append({
                                "type": "text",
                                "bbox": bbox,
                                "text_preview": block_text[:200],
                            })

                    elif block["type"] == 1:  # Image block
                        page_structure["blocks"].append({
                            "type": "image",
                            "bbox": block["bbox"],
                            "width": block.get("width"),
                            "height": block.get("height"),
                        })

                fields.extend(page_fields)
                structure["pages"].append(page_structure)

            # Extract document-level metadata
            metadata_dict = doc.metadata or {}
            for key, value in metadata_dict.items():
                if value and key not in ("creationDate", "modDate"):
                    fields.append(self._create_field(
                        field_name=f"pdf_meta_{key}",
                        value=value,
                        confidence=Confidence(value=1.0, method="parser"),
                        metadata={"source": "pdf_metadata"},
                    ))

            # Create document
            raw_content = "\n".join(raw_text_parts)
            metadata = ParsedDocumentMetadata(
                document_id="",  # Will be set by caller
                original_filename=file_path.name,
                mime_type=mime_type,
                file_size=file_path.stat().st_size,
                sha256="",  # Will be set by caller
                page_count=page_count,
                parser_version=self.parser_version,
                processing_time_ms=0,
            )

            document = ParsedDocument(
                metadata=metadata,
                fields=fields,
                raw_content=raw_content,
                structure=structure,
                warnings=self.warnings.copy(),
            )

            return ParseResult(document=document, warnings=self.warnings.copy())

        finally:
            doc.close()


def is_encrypted_pdf(file_path: Path) -> bool:
    """Check if a PDF is encrypted/password-protected."""
    try:
        doc = fitz.open(file_path)
        is_enc = doc.needs_pass
        doc.close()
        return is_enc
    except Exception:
        return False


def get_pdf_page_count(file_path: Path) -> int:
    """Get the number of pages in a PDF."""
    try:
        doc = fitz.open(file_path)
        count = doc.page_count
        doc.close()
        return count
    except Exception:
        return 0