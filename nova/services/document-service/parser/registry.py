"""Parser registry and factory."""

from pathlib import Path

from nova.services.document_service.parser.base import BaseParser, ParseResult
from nova.services.document_service.parser.csv_parser import CSVParser
from nova.services.document_service.parser.docx_parser import DOCXParser
from nova.services.document_service.parser.pdf_parser import PDFParser
from nova.services.document_service.parser.txt_parser import TXTParser
from nova.services.document_service.schemas import ParserSettings


class ParserRegistry:
    """Registry of available parsers by MIME type and extension."""

    def __init__(self, settings: ParserSettings):
        self.settings = settings
        self._parsers: dict[str, BaseParser] = {}
        self._ext_map: dict[str, str] = {}

        # Register built-in parsers
        self._register_parser("application/pdf", PDFParser(settings))
        self._register_parser(
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            DOCXParser(settings)
        )
        self._register_parser("text/csv", CSVParser(settings))
        self._register_parser(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            CSVParser(settings)
        )
        self._register_parser("text/plain", TXTParser(settings))

        # Extension mapping
        self._ext_map = {
            ".pdf": "application/pdf",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".csv": "text/csv",
            ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".txt": "text/plain",
        }

    def _register_parser(self, mime_type: str, parser: BaseParser) -> None:
        self._parsers[mime_type] = parser

    def get_parser(self, mime_type: str) -> BaseParser | None:
        """Get parser by MIME type."""
        return self._parsers.get(mime_type)

    def get_parser_for_file(self, file_path: Path) -> BaseParser | None:
        """Get parser by file extension."""
        ext = file_path.suffix.lower()
        mime_type = self._ext_map.get(ext)
        if mime_type:
            return self._parsers.get(mime_type)
        return None

    def parse_file(self, file_path: Path, mime_type: str) -> ParseResult:
        """Parse a file using the appropriate parser."""
        parser = self.get_parser(mime_type)
        if not parser:
            parser = self.get_parser_for_file(file_path)

        if not parser:
            raise ValueError(f"No parser available for {mime_type} / {file_path.suffix}")

        return parser.parse(file_path, mime_type)

    def list_supported_types(self) -> list[str]:
        """List supported MIME types."""
        return list(self._parsers.keys())