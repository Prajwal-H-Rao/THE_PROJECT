"""CSV and XLSX parser using pandas with column provenance."""

from pathlib import Path
from typing import Any

import pandas as pd

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


class CSVParser(BaseParser):
    """CSV and XLSX parser using pandas with column provenance."""

    def __init__(self, settings: ParserSettings):
        super().__init__(settings)
        self.parser_version = "pandas"

    def parse(self, file_path: Path, mime_type: str) -> ParseResult:
        """Parse a CSV or XLSX file with column provenance."""
        self.warnings = []

        try:
            ext = file_path.suffix.lower()

            if ext == ".csv":
                df = pd.read_csv(
                    file_path,
                    encoding=self.settings.csv_encoding,
                    delimiter=self.settings.csv_delimiter,
                    dtype=str,  # Read all as strings to preserve formatting
                    keep_default_na=False,
                )
            elif ext == ".xlsx":
                df = pd.read_excel(file_path, dtype=str, engine="openpyxl")
            else:
                raise ValueError(f"Unsupported file type: {ext}")

            fields = []
            structure = {"sheets": []}
            raw_text_parts = []

            # For XLSX, there might be multiple sheets
            if ext == ".xlsx":
                # Re-read with sheet_name=None to get all sheets
                sheets = pd.read_excel(file_path, sheet_name=None, dtype=str, engine="openpyxl")
                for sheet_name, sheet_df in sheets.items():
                    sheet_fields, sheet_structure, sheet_text = self._parse_dataframe(
                        sheet_df, f"sheet_{sheet_name}"
                    )
                    fields.extend(sheet_fields)
                    structure["sheets"].append(sheet_structure)
                    raw_text_parts.append(sheet_text)
            else:
                sheet_fields, sheet_structure, sheet_text = self._parse_dataframe(df, "csv")
                fields.extend(sheet_fields)
                structure["sheets"].append(sheet_structure)
                raw_text_parts.append(sheet_text)

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

            document = ParsedDocument(
                metadata=metadata,
                fields=fields,
                raw_content="\n".join(raw_text_parts),
                structure=structure,
                warnings=self.warnings.copy(),
            )

            return ParseResult(document=document, warnings=self.warnings.copy())

        except UnicodeDecodeError as e:
            self._add_warning(f"Encoding error: {e}")
            # Try with different encoding
            return self._parse_with_fallback(file_path, mime_type)
        except Exception as e:
            self._add_warning(f"CSV/XLSX parsing error: {e}")
            raise

    def _parse_dataframe(self, df: pd.DataFrame, source_name: str) -> tuple[list, dict, str]:
        """Parse a DataFrame and return fields, structure, and raw text."""
        fields = []
        raw_lines = []

        # Column headers as fields
        for col_idx, col_name in enumerate(df.columns):
            field = self._create_field(
                field_name=f"{source_name}_column_{col_name}",
                value=list(df[col_name].astype(str).values),
                source_ref=SourceSpan(
                    column=col_idx + 1,
                    raw_text=f"Column: {col_name}",
                ),
                confidence=Confidence(value=1.0, method="parser"),
                review_status=ReviewStatus.REVIEWED,
                metadata={
                    "source": source_name,
                    "column_index": col_idx,
                    "dtype": str(df[col_name].dtype),
                    "non_null_count": int(df[col_name].notna().sum()),
                },
            )
            fields.append(field)

        # Row data as fields (for small datasets)
        if len(df) <= 100:  # Limit to avoid explosion
            for row_idx, row in df.iterrows():
                row_data = {}
                for col_idx, col_name in enumerate(df.columns):
                    row_data[col_name] = str(row[col_name])

                field = self._create_field(
                    field_name=f"{source_name}_row_{row_idx}",
                    value=row_data,
                    source_ref=SourceSpan(
                        line=row_idx + 1,
                        raw_text=str(row_data)[:200],
                    ),
                    confidence=Confidence(value=1.0, method="parser"),
                    review_status=ReviewStatus.REVIEWED,
                    metadata={"source": source_name, "row_index": row_idx},
                )
                fields.append(field)

        # Build raw text representation
        raw_lines.append(df.to_string(index=False, max_rows=50))
        raw_text = "\n".join(raw_lines)

        structure = {
            "source": source_name,
            "shape": df.shape,
            "columns": list(df.columns),
            "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
        }

        return fields, structure, raw_text

    def _parse_with_fallback(self, file_path: Path, mime_type: str) -> ParseResult:
        """Try parsing with different encodings."""
        encodings = ["utf-8", "latin-1", "cp1252", "iso-8859-1"]

        for encoding in encodings:
            try:
                self.settings.csv_encoding = encoding
                df = pd.read_csv(
                    file_path,
                    encoding=encoding,
                    delimiter=self.settings.csv_delimiter,
                    dtype=str,
                    keep_default_na=False,
                )
                self._add_warning(f"Used fallback encoding: {encoding}")
                fields, structure, raw_text = self._parse_dataframe(df, "csv")

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

                return ParseResult(
                    document=ParsedDocument(
                        metadata=metadata,
                        fields=fields,
                        raw_content=raw_text,
                        structure=structure,
                        warnings=self.warnings.copy(),
                    ),
                    warnings=self.warnings.copy(),
                )
            except Exception:
                continue

        raise ValueError("Could not parse CSV with any supported encoding")


from nova.services.document_service.schemas.extraction import SourceSpan