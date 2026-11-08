"""Citation validator (task 06.17).

Pure stdlib: no pydantic, no minio, no flask. A citation ID must resolve to a
stored span (spec:824). A citation ID with no stored span is rejected — it is
never silently accepted as real.

`validate_citation` checks a citation ID against a set of valid citation IDs.
`resolve_citation` returns the stored span dict for a citation ID, or raises
CitationError when no span is stored for it.
"""


class CitationError(Exception):
    """Raised when a citation ID cannot be resolved to a stored span."""


def validate_citation(citation_id: str, valid_ids) -> str:
    """Return citation_id when it resolves to a stored span.

    Raises CitationError when citation_id is not among valid_ids (the set of
    citation IDs that have stored spans). A fabricated citation fails here.
    """
    if citation_id not in set(valid_ids):
        raise CitationError(
            f"citation {citation_id!r} does not resolve to a stored span"
        )
    return citation_id


def resolve_citation(citation_id: str, spans: dict) -> dict:
    """Return the stored span dict for citation_id.

    `spans` maps citation_id -> span dict (plain dict, no pydantic). Raises
    CitationError when no span is stored for citation_id.
    """
    if citation_id not in spans:
        raise CitationError(
            f"citation {citation_id!r} has no stored span"
        )
    return spans[citation_id]
