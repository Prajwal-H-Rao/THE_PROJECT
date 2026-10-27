"""Python mirror of tool.ts for cross-language contract parity."""

from dataclasses import dataclass
from typing import Any, Dict, Literal, Optional, get_args

ToolRiskTier = Literal["tier1", "tier2", "tier3", "tier4"]
ToolIdempotency = Literal["none", "idempotency_key", "natural"]
ToolClassification = Literal["read", "write"]

TOOL_RISK_TIER_VALUES: tuple[ToolRiskTier, ...] = ("tier1", "tier2", "tier3", "tier4")
TOOL_IDEMPOTENCY_VALUES: tuple[ToolIdempotency, ...] = ("none", "idempotency_key", "natural")
TOOL_CLASSIFICATION_VALUES: tuple[ToolClassification, ...] = ("read", "write")

# Canonical families
CanonicalFamily = Literal[
    "inbox",
    "calendar_tasks",
    "notes_memory",
    "finance",
    "trips",
    "resume_jobs",
    "integrations",
]

CANONICAL_FAMILY_VALUES: tuple[CanonicalFamily, ...] = (
    "inbox",
    "calendar_tasks",
    "notes_memory",
    "finance",
    "trips",
    "resume_jobs",
    "integrations",
)


@dataclass
class ToolArgumentSchema:
    schema: Dict[str, Any]


@dataclass
class ToolDefinition:
    name: str
    description: str
    arguments: Dict[str, Any]
    output: Dict[str, Any]
    allowed_roles: Optional[list[str]] = None
    allowed_scopes: Optional[list[str]] = None
    classification: ToolClassification = "read"
    risk_tier: ToolRiskTier = "tier1"
    idempotency: ToolIdempotency = "none"
    timeout: Optional[str] = None
    version: int = 1
    provider_allowlist: Optional[list[str]] = None
    quota: Optional[str] = None
    verifier: str = ""
    family: CanonicalFamily = "inbox"
    operation_id: str = ""
    owning_service: str = ""
    mcp_server: str = ""
    resource_scope: str = ""


@dataclass
class ToolOutputSchema:
    schema: Dict[str, Any]


@dataclass
class ToolError:
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None


@dataclass
class ToolResult:
    ok: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[ToolError] = None


def validate_schema_object(obj: Any, field_name: str) -> None:
    if not obj or not isinstance(obj, dict):
        raise ValueError(f"{field_name} must be a non-empty object")


def validate_tool_definition(def_dict: Dict[str, Any]) -> ToolDefinition:
    """Validate a tool definition dict and return a ToolDefinition object.
    
    Unknown fields are rejected for security.
    """
    # Create a shallow copy to avoid mutating caller's object
    validated = dict(def_dict)
    
    # Unknown-field rejection (spec:167)
    known_fields = {
        "name", "description", "arguments", "output", "allowed_roles", "allowed_scopes",
        "classification", "risk_tier", "idempotency", "timeout", "version",
        "provider_allowlist", "quota", "verifier", "family", "operation_id",
        "owning_service", "mcp_server", "resource_scope"
    }
    for key in validated:
        if key not in known_fields:
            raise ValueError(f"Unknown field in tool definition: {key}")
    
    # Required fields
    required_fields = ["name", "description", "arguments", "output", "classification",
                       "verifier", "family", "operation_id", "owning_service",
                       "mcp_server", "resource_scope"]
    for field in required_fields:
        if field not in validated:
            raise ValueError(f"{field} is required")
    
    # Validate name
    name = validated["name"]
    if not isinstance(name, str) or not name:
        raise ValueError("Tool name is required")
    import re
    if not re.match(r'^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$', name):
        raise ValueError("Tool name must be in 'family.action' format")
    
    # Validate description
    description = validated["description"]
    if not isinstance(description, str) or not description:
        raise ValueError("Tool description is required")
    
    # Validate arguments and output
    validate_schema_object(validated["arguments"], "arguments")
    validate_schema_object(validated["output"], "output")
    
    # Validate classification
    classification = validated["classification"]
    if classification not in TOOL_CLASSIFICATION_VALUES:
        raise ValueError(f"classification must be one of {TOOL_CLASSIFICATION_VALUES}")
    
    # Default risk_tier based on classification if not provided
    risk_tier = validated.get("risk_tier", "tier1" if classification == "read" else "tier2")
    if risk_tier not in TOOL_RISK_TIER_VALUES:
        raise ValueError(f"risk_tier must be one of {TOOL_RISK_TIER_VALUES}")
    
    # Default idempotency if not provided
    idempotency = validated.get("idempotency", "none")
    if idempotency not in TOOL_IDEMPOTENCY_VALUES:
        raise ValueError(f"idempotency must be one of {TOOL_IDEMPOTENCY_VALUES}")
    
    # Validate version
    version = validated.get("version", 1)
    if not isinstance(version, int) or version < 1:
        raise ValueError("version must be a positive integer")
    
    # Validate optional fields
    allowed_roles = validated.get("allowed_roles")
    if allowed_roles is not None and not isinstance(allowed_roles, list):
        raise ValueError("allowed_roles must be a list if provided")
    
    allowed_scopes = validated.get("allowed_scopes")
    if allowed_scopes is not None and not isinstance(allowed_scopes, list):
        raise ValueError("allowed_scopes must be a list if provided")
    
    timeout = validated.get("timeout")
    if timeout is not None and not isinstance(timeout, str):
        raise ValueError("timeout must be a string if provided")
    
    provider_allowlist = validated.get("provider_allowlist")
    if provider_allowlist is not None and not isinstance(provider_allowlist, list):
        raise ValueError("provider_allowlist must be a list if provided")
    
    quota = validated.get("quota")
    if quota is not None and not isinstance(quota, str):
        raise ValueError("quota must be a string if provided")
    
    # New required fields (v4) - two-step validation for verifier
    if "verifier" in validated and validated["verifier"] is not None and not isinstance(validated["verifier"], str):
        raise ValueError("verifier must be a string")
    verifier = validated.get("verifier")
    if not verifier or not isinstance(verifier, str):
        raise ValueError("Verifier is required and must be a string")
    
    family = validated.get("family")
    if not family or not isinstance(family, str) or family not in CANONICAL_FAMILY_VALUES:
        raise ValueError(f"Family is required and must be one of: {CANONICAL_FAMILY_VALUES}")
    
    operation_id = validated.get("operation_id")
    if not operation_id or not isinstance(operation_id, str):
        raise ValueError("Operation ID is required and must be a string")
    
    owning_service = validated.get("owning_service")
    if not owning_service or not isinstance(owning_service, str):
        raise ValueError("Owning service is required and must be a string")
    
    mcp_server = validated.get("mcp_server")
    if not mcp_server or not isinstance(mcp_server, str):
        raise ValueError("MCP server is required and must be a string")
    
    resource_scope = validated.get("resource_scope")
    if not resource_scope or not isinstance(resource_scope, str):
        raise ValueError("Resource scope is required and must be a string")
    
    return ToolDefinition(
        name=validated["name"],
        description=validated["description"],
        arguments=validated["arguments"],
        output=validated["output"],
        allowed_roles=allowed_roles,
        allowed_scopes=allowed_scopes,
        classification=classification,
        risk_tier=risk_tier,
        idempotency=idempotency,
        timeout=timeout,
        version=version,
        provider_allowlist=validated.get("provider_allowlist"),
        quota=quota,
        verifier=verifier,
        family=family,
        operation_id=operation_id,
        owning_service=owning_service,
        mcp_server=mcp_server,
        resource_scope=resource_scope,
    )