"""Byte-level rejection rules for bad fixtures (task 06.14).

Pure stdlib: no pydantic, no flask, no package imports. Each rule takes bytes
or ints and returns a rejection reason string, or None when the input passes.

These rules are the single source of truth for byte-level rejections:
encrypted PDF, invalid magic bytes, oversized, scanned-beyond-limit pages.

settings-level checks (extension, MIME, size limit against QuarantineSettings)
stay in quarantine.py and call these rules where they apply.

Residual limits (documented in changes/2026-11-06-p3-m06-t14-bad-fixture-corpus.md):
- /Encrypt scan is confined to the last 4 KB (trailer window). An encrypted
  marker inside a content stream is not flagged.
- Page count is a byte scan for /Type /Page markers excluding /Pages; pages
  inside compressed object streams are not counted. Enforcement at ingress is
  therefore best-effort; the PyMuPDF parser path (task 06.5) enforces pages
  deterministically.
"""

import re

# Trailer window: /Encrypt lives in the PDF trailer near end of file.
_TRAILER_WINDOW = 4096

# Page marker: /Type /Page on an object boundary, but not /Type /Pages.
_PAGE_MARKER = re.compile(rb"/Type\s*/Page(?!s)")

_ENCRYPT_MARKER = rb"/Encrypt"


def reject_encrypted_pdf(file_bytes: bytes) -> str | None:
    """Reject a PDF whose trailer declares /Encrypt (password protected)."""
    window = (
        file_bytes[-_TRAILER_WINDOW:]
        if len(file_bytes) > _TRAILER_WINDOW
        else file_bytes
    )
    if _ENCRYPT_MARKER in window:
        return "encrypted PDF: password-protected files are not allowed"
    return None


def reject_invalid_magic(file_bytes: bytes, extension: str) -> str | None:
    """Reject a file whose magic bytes do not match its extension."""
    if extension == ".pdf" and not file_bytes.startswith(b"%PDF-"):
        return "invalid PDF magic bytes: file does not start with %PDF-"
    if extension == ".docx" and not file_bytes.startswith(b"PK\x03\x04"):
        return "invalid DOCX magic bytes: not a ZIP-based file"
    if extension in {".csv", ".txt"}:
        head = file_bytes[:1024]
        try:
            head.decode("utf-8")
        except UnicodeDecodeError:
            try:
                head.decode("latin-1")
            except UnicodeDecodeError:
                return "text file could not be decoded as UTF-8 or Latin-1"
    return None


def reject_oversized(size_bytes: int, max_bytes: int) -> str | None:
    """Reject a file larger than max_bytes."""
    if size_bytes > max_bytes:
        return (
            f"file size {size_bytes} bytes exceeds maximum {max_bytes} bytes"
        )
    return None


def reject_beyond_page_limit(file_bytes: bytes, max_pages: int) -> str | None:
    """Reject a PDF whose page markers exceed max_pages."""
    count = len(_PAGE_MARKER.findall(file_bytes))
    if count > max_pages:
        return (
            f"scanned-beyond-limit PDF: {count} pages exceed maximum {max_pages}"
        )
    return None
