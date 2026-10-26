"""TXT and bank statement parser."""

from pathlib import Path
from typing import Any
import re

from nova.services.document_service.parser.base import BaseParser, ParseResult
from nova.services.document_service.schemas import ParserSettings
from nova.services.document_service.schemas.extraction import (
    ParsedDocument,
    ParsedDocumentMetadata,
    FieldExtraction,
    SourceSpan,
    Confidence,
    ReviewStatus,
)


class TXTParser(BaseParser):
    """Text file and bank statement parser."""

    def __init__(self, settings: ParserSettings):
        super().__init__(settings)
        self.parser_version = "txt"

    def parse(self, file_path: Path, mime_type: str) -> ParseResult:
        """Parse a text file or bank statement."""
        self.warnings = []

        try:
            # Read file with encoding detection
            content = self._read_with_encoding(file_path)

            # Detect if it's a bank statement
            if self._is_bank_statement(content):
                return self._parse_bank_statement(file_path, content, mime_type)

            # Regular text file
            return self._parse_text_file(file_path, content, mime_type)

        except Exception as e:
            self._add_warning(f"Text parsing error: {e}")
            raise

    def _read_with_encoding(self, file_path: Path) -> str:
        """Read file with encoding detection."""
        encodings = ["utf-8", "latin-1", "cp1252", "iso-8859-1"]
        for encoding in encodings:
            try:
                return file_path.read_text(encoding=encoding)
            except UnicodeDecodeError:
                continue
        # Last resort: read as binary and decode with replacement
        return file_path.read_bytes().decode("utf-8", errors="replace")

    def _is_bank_statement(self, content: str) -> bool:
        """Heuristic to detect bank statement format."""
        content_lower = content.lower()
        bank_keywords = [
            "statement", "account", "balance", "transaction",
            "debit", "credit", "withdrawal", "deposit",
            "opening balance", "closing balance", "statement period",
        ]
        matches = sum(1 for kw in bank_keywords if kw in content_lower)
        return matches >= 3

    def _parse_bank_statement(self, file_path: Path, content: str, mime_type: str) -> ParseResult:
        """Parse bank statement with row/column provenance."""
        fields = []
        lines = content.splitlines()
        raw_text_parts = []

        # Try to parse as CSV-like structure
        transactions = []
        header_found = False
        header_line = -1
        date_pattern = re.compile(r"\d{1,2}[/-]\d{1,2}[/-]\d{2,4}")
        amount_pattern = re.compile(r"[-+]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?")

        for line_idx, line in enumerate(lines):
            raw_text_parts.append(line)

            # Look for header row
            if not header_found and any(kw in line.lower() for kw in ["date", "description", "amount", "balance"]):
                header_found = True
                header_line = line_idx
                continue

            if header_found and line.strip():
                # Try to parse transaction row
                parts = re.split(r"\s{2,}|\t|,", line)
                if len(parts) >= 3:
                    # Check if first part looks like a date
                    if date_pattern.search(parts[0]):
                        date_str = parts[0].strip()
                        desc = parts[1].strip() if len(parts) > 1 else ""
                        amount_str = parts[2].strip() if len(parts) > 2 else ""
                        balance_str = parts[3].strip() if len(parts) > 3 else ""

                        # Validate amount
                        if amount_pattern.search(amount_str):
                            transaction = {
                                "date": date_str,
                                "description": desc,
                                "amount": amount_str,
                                "balance": balance_str,
                                "row": line_idx + 1,
                            }
                            transactions.append(transaction)

                            fields.append(self._create_field(
                                field_name=f"transaction_{len(transactions)}",
                                value=transaction,
                                source_ref=SourceSpan(
                                    line=line_idx + 1,
                                    raw_text=line[:200],
                                ),
                                confidence=Confidence(value=0.9, method="parser"),
                                review_status=ReviewStatus.NEEDS_REVIEW,
                                metadata={"type": "bank_transaction"},
                            ))

        # Add statement metadata fields
        if transactions:
            fields.append(self._create_field(
                field_name="statement_transaction_count",
                value=len(transactions),
                confidence=Confidence(value=1.0, method="parser"),
                metadata={"type": "statement_summary"},
            ))

            # Extract date range
            dates = [t["date"] for t in transactions if t["date"]]
            if dates:
                fields.append(self._create_field(
                    field_name="statement_date_range",
                    value={"from": min(dates), "to": max(dates)},
                    confidence=Confidence(value=0.8, method="parser"),
                    metadata={"type": "statement_summary"},
                ))

        metadata = ParsedDocumentMetadata(
            document_id="",
            original_filename=file_path.name,
            mime_type=mime_type,
            file_size=file_path.stat().st_size,
            sha256="",
            page_count=None,
            parser_version=self.parser_version,
            processing_time_ms=0,
        )

        structure = {
            "type": "bank_statement",
            "transaction_count": len(transactions),
            "has_header": header_found,
            "header_line": header_line,
        }

        document = ParsedDocument(
            metadata=metadata,
            fields=fields,
            raw_content="\n".join(raw_text_parts),
            structure=structure,
            warnings=self.warnings.copy(),
        )

        return ParseResult(document=document, warnings=self.warnings.copy())

    def _parse_text_file(self, file_path: Path, content: str, mime_type: str) -> ParseResult:
        """Parse a regular text file."""
        fields = []
        lines = content.splitlines()
        raw_text_parts = lines

        # Each paragraph as a field
        para_idx = 0
        current_para = []

        for line_idx, line in enumerate(lines):
            if line.strip():
                current_para.append(line)
            elif current_para:
                para_text = "\n".join(current_para)
                fields.append(self._create_field(
                    field_name=f"paragraph_{para_idx}",
                    value=para_text,
                    source_ref=SourceSpan(
                        line=line_idx - len(current_para) + 1,
                        char_start=0,
                        char_end=len(para_text),
                        raw_text=para_text[:500],
                    ),
                    confidence=Confidence(value=1.0, method="parser"),
                    review_status=ReviewStatus.REVIEWED,
                ))
                para_idx += 1
                current_para = []

        # Last paragraph
        if current_para:
            para_text = "\n".join(current_para)
            fields.append(self._create_field(
                field_name=f"paragraph_{para_idx}",
                value=para_text,
                source_ref=SourceSpan(
                    line=len(lines) - len(current_para) + 1,
                    raw_text=para_text[:500],
                ),
                confidence=Confidence(value=1.0, method="parser"),
                review_status=ReviewStatus.REVIEWED,
            ))

        metadata = ParsedDocumentMetadata(
            document_id="",
            original_filename=file_path.name,
            mime_type=mime_type,
            file_size=file_path.stat().st_size,
            sha256="",
            page_count=None,
            parser_version=self.parser_version,
            processing_time_ms=0,
        )

        structure = {
            "type": "text_file",
            "line_count": len(lines),
            "paragraph_count": para_idx + (1 if current_para else 0),
        }

        document = ParsedDocument(
            metadata=metadata,
            fields=fields,
            raw_content="\n".join(raw_text_parts),
            structure=structure,
            warnings=self.warnings.copy(),
        )

        return ParseResult(document=document, warnings=self.warnings.copy())


import re