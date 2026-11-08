"""Test for task 06.14: every bad fixture fails safely.

stdlib-only: loads fixture_rules.py via importlib (no pydantic/flask import),
reads the corpus manifest, and asserts each bad fixture is rejected with the
expected typed reason and that no rule crashes. Runs with plain python3.
Also text-asserts that quarantine.py wires fixture_rules into validate_file
and that schemas/settings.py pins max_pages to the manifest's 500.
"""

import importlib.util
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
MANIFEST = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))

RULES_PATH = (
    pathlib.Path(__file__).resolve().parents[2]
    / "services"
    / "document-service"
    / "ingest"
    / "fixture_rules.py"
)
QUARANTINE_PATH = RULES_PATH.parent / "quarantine.py"
SETTINGS_PATH = (
    pathlib.Path(__file__).resolve().parents[2]
    / "services"
    / "document-service"
    / "schemas"
    / "settings.py"
)


def load_fixture_rules():
    """Load fixture_rules.py as a standalone module (avoids pydantic import)."""
    spec = importlib.util.spec_from_file_location("fixture_rules", RULES_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def read_bytes(name: str) -> bytes:
    """Return corpus file bytes."""
    return (ROOT / name).read_bytes()


def test_encrypted_pdf_rejected() -> None:
    """A password-protected PDF returns a typed error, not a crash."""
    rules = load_fixture_rules()
    reason = rules.reject_encrypted_pdf(read_bytes("encrypted.pdf"))
    assert reason is not None, "encrypted PDF must be rejected"
    assert "encrypted" in reason.lower(), reason


def test_invalid_magic_rejected() -> None:
    """A file whose magic bytes do not match its extension is rejected."""
    rules = load_fixture_rules()
    reason = rules.reject_invalid_magic(read_bytes("invalid-magic.pdf"), ".pdf")
    assert reason is not None, "invalid-magic PDF must be rejected"
    assert "magic" in reason.lower(), reason


def test_scanned_beyond_limit_rejected() -> None:
    """A PDF beyond the page limit is rejected."""
    rules = load_fixture_rules()
    reason = rules.reject_beyond_page_limit(
        read_bytes("scanned-beyond-limit.pdf"), MANIFEST["page_limit"]
    )
    assert reason is not None, "scanned-beyond-limit PDF must be rejected"
    assert "page" in reason.lower(), reason


def test_oversized_upload_rejected() -> None:
    """An oversized upload is rejected at ingress with a typed error."""
    rules = load_fixture_rules()
    entry = next(f for f in MANIFEST["fixtures"] if f["kind"] == "oversized")
    oversized = b"\x00" * entry["generate_size"]
    reason = rules.reject_oversized(len(oversized), MANIFEST["size_limit"])
    assert reason is not None, "oversized upload must be rejected"
    assert "exceeds" in reason.lower(), reason


def test_all_corpus_fixtures_fail_safely() -> None:
    """Every manifest fixture yields a rejection reason; none crashes."""
    rules = load_fixture_rules()
    for entry in MANIFEST["fixtures"]:
        name = entry["name"]
        kind = entry["kind"]
        reason = None
        if kind == "encrypted_pdf":
            reason = rules.reject_encrypted_pdf(read_bytes(name))
        elif kind == "invalid_magic":
            reason = rules.reject_invalid_magic(read_bytes(name), pathlib.Path(name).suffix.lower())
        elif kind == "page_limit":
            reason = rules.reject_beyond_page_limit(read_bytes(name), MANIFEST["page_limit"])
        elif kind == "oversized":
            reason = rules.reject_oversized(entry["generate_size"], MANIFEST["size_limit"])
        assert reason is not None, f"{name} ({kind}) must fail safely, got None"


def test_quarantine_wires_fixture_rules() -> None:
    """validate_file must call fixture_rules so the real path rejects bad fixtures."""
    text = QUARANTINE_PATH.read_text(encoding="utf-8")
    assert "fixture_rules" in text, "quarantine.py must import fixture_rules"
    assert "reject_encrypted_pdf" in text, "quarantine.py must enforce encrypted rule"
    assert "reject_beyond_page_limit" in text, "quarantine.py must enforce page limit"


def test_settings_pin_max_pages() -> None:
    """The manifest's page limit must match schemas/settings.py default."""
    text = SETTINGS_PATH.read_text(encoding="utf-8")
    assert "max_pages" in text, "settings must declare max_pages"
    assert "default=500" in text, "settings max_pages default must be 500"


if __name__ == "__main__":
    test_encrypted_pdf_rejected()
    test_invalid_magic_rejected()
    test_scanned_beyond_limit_rejected()
    test_oversized_upload_rejected()
    test_all_corpus_fixtures_fail_safely()
    test_quarantine_wires_fixture_rules()
    test_settings_pin_max_pages()
    print("PASS test_bad_fixtures: every bad fixture fails safely")
