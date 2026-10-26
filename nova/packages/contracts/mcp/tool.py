"""Python mirror of tool.ts for cross-language contract parity."""

from dataclasses import dataclass
from typing import Any, Dict, Literal, Optional, get_args

ToolRiskTier = Literal["tier1", "tier2", "tier3", "tier4"]
ToolIdempotency = Literal["none", "idempotency_key", "natural"]
ToolClassification = Literal["read", "write"]

TOOL_RISK_TIER_VALUES: tuple[ToolRiskTier, ...] = ("tier1", "tier2", "tier3", "tier4")
TOOL_IDEMPOTENCY_VALUES: tuple[ToolIdempotency, ...] = ("none", "idempotency_key", "natural")
TOOL_CLASSIFICATION_VALUES: tuple[ToolClassification, ...] = ("read", "write")


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
    verifier: Optional[str] = None
    family: Optional[str] = None
    operation_id: Optional[str] = None
    owning_service: Optional[str] = None
    mcp_server: Optional[str] = None
    resource_scope: Optional[str] = None


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
    
    # Required fields
    required_fields = ["name", "description", "arguments", "output", "classification"]
    for field in required_fields:
        if field not in validated:
            raise ValueError(f"{field} is required")
    
    # Validate classification
    classification = validated["classification"]
    if classification not in TOOL_CLASSIFICATION_VALUES:
        raise ValueError(f"classification must be one of {TOOL_CLASSIFICATION_VALUES}")
    
    # Validate arguments schema
    validate_schema_object(validated["arguments"], "arguments")
    validate_schema_object(validated["output"], "output")
    
    # Validate risk_tier
    risk_tier = validated.get("risk_tier", "tier1" if classification == "read" else "tier2")
    if risk_tier not in TOOL_RISK_TIER_VALUES:
        raise ValueError(f"risk_tier must be one of {TOOL_RISK_TIER_VALUES}")
    
    # Validate idempotency
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
    
    verifier = validated.get("verifier")
    if verifier is not None and not isinstance(verifier, str):
        raise ValueError("verifier must be a string if provided")
    
    # New required fields (v4)
    family = validated.get("family")
    if family is not None and not isinstance(family, str):
        raise ValueError("family must be a string if provided")
    
    operation_id = validated.get("operation_id")
    if operation_id is not None and not isinstance(operation_id, str):
        raise ValueError("operation_id must be a string if provided")
    
    owning_service = validated.get("owning_service")
    if owning_service is not None and not isinstance(owning_service, str):
        raise ValueError("owning_service must be a string if provided")
    
    mcp_server = validated.get("mcp_server")
    if mcp_server is not None and not isinstance(mcp_server, str):
        raise ValueError("mcp_server must be a string if provided")
    
    resource_scope = validated.get("resource_scope")
    if resource_scope is not None and not isinstance(resource_scope, str):
        raise ValueError("resource_scope must be a string if provided")
    
    # Check for unknown fields
    known_fields = {
        "name", "description", "arguments", "output", "allowed_roles", "allowed_scopes",
        "classification", "risk_tier", "idempotency", "timeout", "version",
        "provider_allowlist", "quota", "verifier", "family", "operation_id",
        "owning_service", "mcp_server", "resource_scope"
    }
    for key in validated:
        if key not in known_fields:
            raise ValueError(f"Unknown field in tool definition: {key}")
    
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
        provider_allowlist=provider_allowlist,
        quota=quota,
        verifier=verifier,
        family=family,
        operation_id=operation_id,
        owning_service=owning_service,
        mcp_server=mcp_server,
        resource_scope=resource_scope,
    )