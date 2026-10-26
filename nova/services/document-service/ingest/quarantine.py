"""Quarantine module for validating and storing uploaded files."""

import hashlib
import mimetypes
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

from nova.services.document_service.schemas import QuarantineSettings


class ValidationError(Exception):
    """Raised when file validation fails."""
    pass


class QuarantineError(Exception):
    """Raised when quarantine storage fails."""
    pass


ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
}

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".csv", ".xlsx", ".txt"}


def validate_file(file_bytes: bytes, filename: str, settings: QuarantineSettings) -> None:
    """Validate an uploaded file against quarantine settings."""
    # Check file size
    if len(file_bytes) > settings.max_file_size_bytes:
        raise ValidationError(
            f"File size {len(file_bytes)} bytes exceeds maximum {settings.max_file_size_bytes} bytes"
        )

    # Check extension
    ext = Path(filename).suffix.lower()
    if ext not in settings.allowed_extensions:
        raise ValidationError(
            f"File extension '{ext}' not allowed. Allowed: {settings.allowed_extensions}"
        )

    # Check MIME type (best effort)
    mime_type, _ = mimetypes.guess_type(filename)
    if mime_type and mime_type not in settings.allowed_mime_types:
        raise ValidationError(
            f"MIME type '{mime_type}' not allowed. Allowed: {settings.allowed_mime_types}"
        )

    # Basic magic byte checks for common types
    if ext == ".pdf" and not file_bytes.startswith(b"%PDF"):
        raise ValidationError("File does not appear to be a valid PDF")
    elif ext == ".docx" and not file_bytes.startswith(b"PK\x03\x04"):
        raise ValidationError("File does not appear to be a valid DOCX (ZIP-based)")
    elif ext in {".csv", ".txt"}:
        # Try to decode as text
        try:
            file_bytes[:1024].decode("utf-8")
        except UnicodeDecodeError:
            try:
                file_bytes[:1024].decode("latin-1")
            except UnicodeDecodeError:
                raise ValidationError("Text file could not be decoded as UTF-8 or Latin-1")


def compute_sha256(file_bytes: bytes) -> str:
    """Compute SHA-256 hash of file bytes."""
    return hashlib.sha256(file_bytes).hexdigest()


def get_mime_type(filename: str, file_bytes: bytes) -> str:
    """Determine MIME type from extension and magic bytes."""
    ext = Path(filename).suffix.lower()
    mime_map = {
        ".pdf": "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".csv": "text/csv",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".txt": "text/plain",
    }
    if ext in mime_map:
        return mime_map[ext]
    # Fallback to mimetypes
    mime_type, _ = mimetypes.guess_type(filename)
    return mime_type or "application/octet-stream"


def quarantine_file(
    file_bytes: bytes,
    original_filename: str,
    settings: QuarantineSettings,
    user_id: str | None = None,
    source_type: str = "upload",
    source_ref: str | None = None,
) -> dict[str, Any]:
    """Store file in quarantine and return metadata."""
    document_id = str(uuid.uuid4())
    sha256_hash = compute_sha256(file_bytes)
    mime_type = get_mime_type(original_filename, file_bytes)

    # Create quarantine directory structure: /quarantine/YYYY/MM/DD/
    now = datetime.utcnow()
    date_path = now.strftime("%Y/%m/%d")
    quarantine_dir = Path(settings.storage_path) / date_path
    quarantine_dir.mkdir(parents=True, exist_ok=True)

    # Store with document_id as filename
    quarantine_filename = f"{document_id}{Path(original_filename).suffix.lower()}"
    quarantine_path = quarantine_dir / quarantine_filename

    try:
        # Write file
        quarantine_path.write_bytes(file_bytes)
    except OSError:
        raise QuarantineError("Failed to write quarantine file")

    # Return metadata for job enqueueing
    return {
        "document_id": document_id,
        "original_filename": original_filename,
        "quarantine_path": str(quarantine_path),
        "mime_type": mime_type,
        "sha256": sha256_hash,
        "file_size": len(file_bytes),
        "user_id": user_id,
        "source_type": source_type,
        "source_ref": source_ref,
        "quarantined_at": datetime.utcnow().isoformat(),
    }


def read_quarantine_file(quarantine_path: str) -> bytes:
    """Read a quarantined file."""
    path = Path(quarantine_path)
    if not path.exists():
        raise FileNotFoundError(f"Quarantine file not found: {quarantine_path}")
    return path.read_bytes()