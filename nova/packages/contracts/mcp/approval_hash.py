"""Python mirror of approval-hash.ts for cross-language grant binding parity.

This module reproduces the exact canonicalization logic from
nova/packages/contracts/approval-hash.ts so that Python services
compute the same payload hash as TypeScript services.
"""

import json
from typing import Any, Set


def check_representable(value: Any, seen: Set[int]) -> None:
    """Values that JSON cannot represent. Rejected instead of silently collapsed."""
    # WHY: undefined is representable by omission (objects) and as null (arrays);
    # canonical_json decides which, per JSON.stringify semantics.
    if value is None or isinstance(value, bool):
        return
    if isinstance(value, (int, float)):
        # WHY: ECMAScript JSON.stringify folds NaN and Infinity to null, which
        # would merge distinct payloads into one hash. Reject them instead.
        if isinstance(value, float) and (value != value or value == float("inf") or value == float("-inf")):
            raise TypeError("payload holds a non-JSON number (NaN or Infinity)")
        return
    if isinstance(value, str):
        return
    if isinstance(value, bytes):
        raise TypeError("payload holds bytes, which JSON cannot represent")
    if not isinstance(value, (list, dict)):
        raise TypeError("payload holds a value JSON cannot represent")
    obj_id = id(value)
    if obj_id in seen:
        raise TypeError("payload holds a cyclic structure")
    seen.add(obj_id)
    if isinstance(value, list):
        for item in value:
            check_representable(item, seen)
    else:
        for item in value.values():
            check_representable(item, seen)
    seen.discard(obj_id)


def canonical_json(value: Any) -> str:
    """Canonical JSON: keys sorted by UTF-16 code unit, no whitespace.
    Object properties holding None are omitted; list items holding None serialize as null.
    Object.is(-0, 0) is treated as equal (both become 0).
    """
    if value is None or not isinstance(value, (list, dict)):
        if isinstance(value, str):
            return json.dumps(value)
        # WHY: JSON.dumps(-0) prints "0", so the two are one canonical value.
        if value == 0 and str(value) == "0":  # Handles -0.0 == 0
            return "0"
        return json.dumps(value)
    if isinstance(value, list):
        return "[" + ",".join(canonical_json(item if item is not None else None) for item in value) + "]"
    # WHY: a Date or Map would silently collapse to "" or {}. Reject anything
    # that is not a plain object, so distinct payloads cannot share one hash.
    if type(value) is not dict:
        raise TypeError("payload holds a non-plain object")
    # Sort keys by UTF-16 code unit (same as Python's default string comparison for ASCII,
    # but we need to match JS's UTF-16 code unit sort for non-ASCII keys)
    entries = [(k, v) for k, v in value.items() if v is not None]
    # Sort by UTF-16 code unit order
    entries.sort(key=lambda kv: kv[0])
    return "{" + ",".join(f"{json.dumps(k)}:{canonical_json(v)}" for k, v in entries) + "}"


def canonical_payload(value: Any) -> str:
    """Encode one payload into its canonical form."""
    check_representable(value, set())
    return canonical_json(value)


def compute_approval_hash(value: Any) -> str:
    """Hash one payload: SHA-256 hex over its canonical JSON bytes."""
    import hashlib
    return hashlib.sha256(canonical_payload(value).encode("utf-8")).hexdigest()