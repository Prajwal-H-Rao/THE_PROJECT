#!/usr/bin/env python3
"""Tool catalogue loader for constrained planning (Module 04 layer 3).

The catalogue JSON files under packages/contracts/mcp/catalogue/ are the
single enumerated source of allowed tool operations. The fake model's
TOOL_CATALOGUE and the router's action names are mirrors, never truth.

The loader is a function, not an import-time side effect: a missing or
broken catalogue is a typed runtime denial at plan time, not a crash of
every import of the workflows package.
"""

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, Optional

# Resolve repo-relative paths once. workflows/ sits four levels below nova/
# (workflows → orchestrator → agent-orchestrator → services → nova).
_NOVA_ROOT = Path(__file__).resolve().parents[4]
_DEFAULT_CATALOGUE_DIR = _NOVA_ROOT / "packages" / "contracts" / "mcp" / "catalogue"
_CONTRACTS_MCP = _NOVA_ROOT / "packages" / "contracts" / "mcp"


class CatalogueError(Exception):
    """Typed fail-closed catalogue error. Code reuses MCP error vocabulary."""

    def __init__(self, code: str, detail: str):
        self.code = code
        self.detail = detail
        super().__init__(f"{code}: {detail}")


def _load_contracts_family_values() -> frozenset:
    """Load CANONICAL_FAMILY_VALUES from the contracts Python mirror.

    WHY importlib by file path: the workflows package runs without the
    contracts package installed, and sys.path insertion with the generic
    name "tool" risks shadowing.
    """
    import importlib.util
    tool_py = _CONTRACTS_MCP / "tool.py"
    try:
        spec = importlib.util.spec_from_file_location("nova_contracts_tool", tool_py)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return frozenset(module.CANONICAL_FAMILY_VALUES)
    except Exception as exc:  # noqa: BLE001 - fail closed on any load failure
        raise CatalogueError("internal_error", f"contracts mirror unusable: {exc}")


@lru_cache(maxsize=8)
def load_tool_catalogue(catalogue_dir: Optional[str] = None) -> Dict[str, Dict[str, Any]]:
    """Load every family catalogue file; fail closed on any defect."""
    directory = Path(catalogue_dir) if catalogue_dir else _DEFAULT_CATALOGUE_DIR
    if not directory.is_dir():
        raise CatalogueError("tool_not_found", f"catalogue directory missing: {directory}")

    files = sorted(directory.glob("*.json"))
    if not files:
        raise CatalogueError("tool_not_found", f"no catalogue files in {directory}")

    family_values = _load_contracts_family_values()
    catalogue: Dict[str, Dict[str, Any]] = {}

    for path in files:
        try:
            data = json.loads(path.read_text())
        except json.JSONDecodeError as exc:
            raise CatalogueError("schema_mismatch", f"{path.name} has invalid JSON: {exc}")

        family = data.get("family")
        if family not in family_values:
            raise CatalogueError("schema_mismatch", f"{path.name} names unknown family: {family}")

        operations = data.get("operations")
        if not isinstance(operations, list) or not operations:
            raise CatalogueError("schema_mismatch", f"{path.name} has no operations")

        for operation in operations:
            operation_id = operation.get("operation_id")
            if not isinstance(operation_id, str) or not operation_id.startswith(f"{family}."):
                raise CatalogueError(
                    "schema_mismatch",
                    f"{path.name} operation id must be '<family>.<name>': {operation_id}",
                )
            if operation_id in catalogue:
                raise CatalogueError("schema_mismatch", f"duplicate operation id: {operation_id}")
            schema = (operation.get("arguments") or {}).get("schema")
            if not isinstance(schema, dict) or schema.get("type") != "object":
                raise CatalogueError(
                    "schema_mismatch",
                    f"{operation_id} arguments schema must be a JSON object type",
                )
            catalogue[operation_id] = operation

    return catalogue


@lru_cache(maxsize=8)
def load_catalogue_families(catalogue_dir: Optional[str] = None) -> Dict[str, frozenset]:
    """Return family -> operation id set from the catalogue (for joins)."""
    catalogue = load_tool_catalogue(catalogue_dir)
    families: Dict[str, set] = {}
    for operation_id in catalogue:
        families.setdefault(operation_id.split(".")[0], set()).add(operation_id)
    return {family: frozenset(operations) for family, operations in families.items()}
