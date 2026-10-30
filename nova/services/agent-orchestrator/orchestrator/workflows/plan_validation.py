#!/usr/bin/env python3
"""Layer 3 plan validation: constrain the model proposal to enumerated tool IDs.

spec:202 — tool selection by the model is only a proposal. This module is
the denial layer between the proposal and execution (Module 04 row 5).

The control is the catalogue enumeration plus fail-closed schema validation,
not content scanning. Prose content fields are NOT scanned: they belong to
layer 6 (untrusted labelling) and layer 7 (verification). A deny-value guard
runs only on command-target fields (ids, query, location-like fields), where
URL, SQL or shell payloads are never legitimate.
"""

import re
from typing import Any, Dict, FrozenSet, List, Optional

# WHY try/except: nodes run both as a package (api server) and as plain
# modules under the standalone test runner.
try:
    from .tool_catalogue import CatalogueError, load_tool_catalogue
except ImportError:
    from tool_catalogue import CatalogueError, load_tool_catalogue

# Argument fields whose values are user prose. Never scanned.
CONTENT_FIELDS: FrozenSet[str] = frozenset({
    "title", "subject", "body", "content", "message", "name", "cover_letter",
    "data",
})

# Command-target fields scan includes these plus any field ending in "_id".
COMMAND_TARGET_FIELDS: FrozenSet[str] = frozenset({
    "query", "source", "origin", "destination", "location", "recipient",
})

# Reject patterns for command-target values. The model must not choose a
# URL, a SQL statement or a chained command as a value (spec:212).
DENY_VALUE_PATTERNS = (
    r"[a-z][a-z0-9+.\-]*://",                         # URL-shaped value
    r"(?i)\bselect\s+\S.*\bfrom\s",                   # SELECT ... FROM
    r"(?i)\b(insert\s+into|delete\s+from|drop\s+table|update\s+\S+\s+set)\s",
    r";\s*\S",                                        # chained command
)

_COMPILED_PATTERNS = tuple(re.compile(pattern) for pattern in DENY_VALUE_PATTERNS)


def _denied_command_value(field: str, value: str) -> bool:
    """Check one non-prose string value against the deny patterns."""
    target = field in COMMAND_TARGET_FIELDS or field.endswith("_id")
    if not target:
        return False
    return any(pattern.search(value) for pattern in _COMPILED_PATTERNS)


def _validate_schema(schema: Dict[str, Any], arguments: Any) -> Optional[str]:
    """Validate arguments against one catalogue schema, fail closed."""
    if not isinstance(arguments, dict):
        return "schema_mismatch"  # non-object arguments are a contract break

    properties = schema.get("properties") or {}
    required = schema.get("required") or []

    for name in required:
        if name not in arguments:
            return "invalid_arguments"

    declared = set(properties.keys())
    for name in arguments:
        if name not in declared:
            return "invalid_arguments"  # additionalProperties: false

    for name, value in arguments.items():
        declared_type = (properties.get(name) or {}).get("type", "string")
        if declared_type == "string" and not isinstance(value, str):
            return "invalid_arguments"
        if declared_type == "integer" and (not isinstance(value, int) or isinstance(value, bool)):
            return "invalid_arguments"
        if declared_type == "number" and (isinstance(value, bool) or not isinstance(value, (int, float))):
            return "invalid_arguments"
        if declared_type == "boolean" and not isinstance(value, bool):
            return "invalid_arguments"
        if declared_type == "array":
            if not isinstance(value, list):
                return "invalid_arguments"
            items_type = ((properties.get(name) or {}).get("items") or {}).get("type")
            if items_type == "string" and not all(isinstance(v, str) for v in value):
                return "invalid_arguments"

    return None


def validate_step(step: Dict[str, Any], catalogue: Dict[str, Dict[str, Any]],
                  routed_family: str) -> Optional[Dict[str, str]]:
    """Validate one proposed step. Returns {code, detail} or None."""
    tool = step.get("tool")
    operation = catalogue.get(tool)
    if operation is None:
        return {"code": "tool_not_found",
                "detail": f"tool '{tool}' is not an enumerated catalogue operation"}
    if not tool.startswith(f"{routed_family}."):
        return {"code": "tool_not_found",
                "detail": f"tool '{tool}' does not belong to family '{routed_family}'"}

    arguments = step.get("arguments")
    if not isinstance(arguments, dict):
        return {"code": "schema_mismatch", "detail": "arguments must be an object"}

    schema = (operation.get("arguments") or {}).get("schema") or {}
    schema_error = _validate_schema(schema, arguments)
    if schema_error:
        return {"code": schema_error, "detail": f"arguments fail the {tool} catalogue schema"}

    for name, value in arguments.items():
        if name in CONTENT_FIELDS or not isinstance(value, str):
            continue
        if _denied_command_value(name, value):
            return {"code": "invalid_arguments",
                    "detail": f"{tool}.{name} carries a denied command or URL value"}

    return None


def validate_plan(steps: List[Dict[str, Any]], routed_family: str,
                  catalogue_dir: Optional[str] = None) -> Optional[Dict[str, str]]:
    """Validate every proposed step against the catalogue. First denial wins."""
    try:
        catalogue = load_tool_catalogue(catalogue_dir)
    except CatalogueError as exc:
        return {"code": exc.code, "detail": exc.detail}
    for step in steps:
        denial = validate_step(step, catalogue, routed_family)
        if denial is not None:
            return denial
    return None
