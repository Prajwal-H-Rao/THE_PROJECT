"""Test for task 06.17: reject citation IDs that do not resolve to a stored span.

stdlib-only: imports validator.py (pure stdlib, no pydantic/minio) and
asserts a fabricated citation ID fails validation while a known citation ID
resolves to its stored span. Spec:824 — citation IDs must resolve to fetched
source records and source spans. Runs with plain python3.
"""

import importlib.util
import pathlib

VALIDATOR_PATH = (
    pathlib.Path(__file__).resolve().parents[2]
    / "services"
    / "document-service"
    / "validator.py"
)


def load_validator():
    """Load validator.py as a standalone module (avoids pydantic/minio import)."""
    spec = importlib.util.spec_from_file_location("validator", VALIDATOR_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


_STORED_SPANS = {
    "cite-001": {"page": 3, "char_start": 120, "char_end": 145, "raw_text": "Python"},
    "cite-002": {"page": 7, "char_start": 400, "char_end": 412, "raw_text": "AWS"},
}


def test_fabricated_citation_rejected() -> None:
    """An invented citation ID fails validation (fabricated citation fails)."""
    validator = load_validator()
    try:
        validator.validate_citation("cite-999", {"cite-001", "cite-002"})
    except validator.CitationError:
        return
    raise AssertionError("fabricated citation cite-999 must be rejected")


def test_fabricated_citation_rejected_by_resolve() -> None:
    """resolve_citation rejects a citation ID with no stored span."""
    validator = load_validator()
    try:
        validator.resolve_citation("cite-invented", _STORED_SPANS)
    except validator.CitationError:
        return
    raise AssertionError("fabricated citation cite-invented must fail to resolve")


def test_valid_citation_resolves() -> None:
    """A known citation ID resolves to its stored span."""
    validator = load_validator()
    span = validator.resolve_citation("cite-001", _STORED_SPANS)
    assert span["raw_text"] == "Python", span
    assert span["page"] == 3, span


def test_validate_citation_returns_id() -> None:
    """validate_citation returns the id when it resolves."""
    validator = load_validator()
    assert validator.validate_citation("cite-002", {"cite-002"}) == "cite-002"


if __name__ == "__main__":
    test_fabricated_citation_rejected()
    test_fabricated_citation_rejected_by_resolve()
    test_valid_citation_resolves()
    test_validate_citation_returns_id()
    print("PASS test_citation_validator: fabricated citation fails; valid citation resolves")
