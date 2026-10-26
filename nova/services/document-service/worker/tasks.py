"""RQ worker tasks for document parsing."""

import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

from nova.services.document_service.schemas import DocumentServiceSettings
from nova.services.document_service.parser.registry import ParserRegistry
from nova.services.document_service.ingest.quarantine import read_quarantine_file, compute_sha256
from nova.services.document_service.storage import store_parsed_document
from nova.services.document_service.schemas.extraction import ExtractionEnvelope


def parse_document_task(
    document_id: str,
    quarantine_path: str,
    mime_type: str,
    settings_dict: dict[str, Any],
) -> dict[str, Any]:
    """Parse a document from quarantine and store the result."""
    start_time = time.time()

    # Reconstruct settings
    settings = DocumentServiceSettings(**settings_dict)

    try:
        # Read quarantined file
        file_bytes = read_quarantine_file(quarantine_path)
        sha256_hash = compute_sha256(file_bytes)

        # Create parser registry
        parser_registry = ParserRegistry(settings.parser)

        # Parse the document
        # We need to write the file to a temp path for the parser
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=Path(quarantine_path).suffix, delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = Path(tmp.name)

        try:
            parse_result = parser_registry.parse_file(tmp_path, mime_type)
        finally:
            # Clean up temp file
            try:
                tmp_path.unlink()
            except Exception:
                pass

        # Update document with metadata
        document = parse_result.document
        processing_time_ms = int((time.time() - start_time) * 1000)

        document.metadata = document.metadata.model_copy(update={
            "document_id": uuid.UUID(document_id),
            "sha256": sha256_hash,
            "processing_time_ms": processing_time_ms,
        })

        # Store the parsed document
        envelope = ExtractionEnvelope(
            object_ref="",  # Will be set by storage
            document=document,
        )

        object_ref = store_parsed_document(envelope, settings)

        envelope = ExtractionEnvelope(
            object_ref=object_ref,
            document=document,
        )

        return {
            "document_id": document_id,
            "status": "completed",
            "object_ref": object_ref,
            "field_count": len(document.fields),
            "warnings": parse_result.warnings,
            "processing_time_ms": processing_time_ms,
        }

    except Exception as e:
        # Log error and re-raise for RQ to handle
        import logging
        logger = logging.getLogger(__name__)
        logger.exception("Parse task failed for document %s", document_id)

        return {
            "document_id": document_id,
            "status": "failed",
            "error": str(e),
            "error_type": type(e).__name__,
        }


def parse_document_task_sync(
    document_id: str,
    quarantine_path: str,
    mime_type: str,
    settings: DocumentServiceSettings,
) -> dict[str, Any]:
    """Synchronous version for testing."""
    return parse_document_task(document_id, quarantine_path, mime_type, settings.model_dump())
