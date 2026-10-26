"""Python mirror of audit.ts for cross-language contract parity."""

import re
from dataclasses import dataclass
from typing import Any, Dict, List, Literal, Optional, Set
from weakref import WeakSet

# MCP audit event types
MCPAuditEventType = Literal[
    "mcp.call.allowed", "mcp.call.denied", "mcp.call.executed", "mcp.call.failed",
    "mcp.approval.granted", "mcp.approval.revoked", "mcp.approval.expired",
]

MCP_AUDIT_EVENT_TYPE_VALUES: List[MCPAuditEventType] = [
    "mcp.call.allowed", "mcp.call.denied", "mcp.call.executed", "mcp.call.failed",
    "mcp.approval.granted", "mcp.approval.revoked", "mcp.approval.expired",
]

# UUID regex accepting all RFC 4122 versions (v1-v5, v7)
UUID_REGEX = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE)

def is_valid_uuid(s: str) -> bool:
    return bool(UUID_REGEX.match(s))


def is_valid_iso8601(s: str) -> bool:
    from datetime import datetime
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        return dt.isoformat().replace("+00:00", "Z") == s or dt.isoformat() == s
    except Exception:
        return False


def is_valid_hex(s: str) -> bool:
    return bool(re.match(r"^[0-9a-f]+$", s, re.IGNORECASE))


def validate_optional_string(val: Any, field_name: str) -> Optional[str]:
    if val is None:
        return None
    if not isinstance(val, str):
        raise ValueError(f"{field_name} must be a string if provided")
    return val


# Forbidden keys for secret detection (stored lowercase for case-insensitive matching)
FORBIDDEN_KEYS: Set[str] = {
    "password", "secret", "token", "key", "jwt", "authorization",
    "access_token", "refresh_token", "api_key", "private_key",
    "apikey", "accesstoken", "refreshtoken", "privatekey",
    "secretkey", "apisecret", "clientsecret", "clientid",
    "authtoken", "bearertoken", "idtoken",
}


def check_for_secrets(obj: Any, path: str = "", visited: Optional[WeakSet] = None) -> None:
    if visited is None:
        visited = WeakSet()
    if not obj or not isinstance(obj, (dict, list)):
        return
    if obj in visited:
        return  # Circular reference detected, skip
    visited.add(obj)
    
    if isinstance(obj, list):
        for i, item in enumerate(obj):
            check_for_secrets(item, f"{path}[{i}]", visited)
        return
    
    for key, value in obj.items():
        lower_key = key.lower()
        if lower_key in FORBIDDEN_KEYS:
            raise ValueError(f"Payload contains forbidden key: {path + '.' if path else ''}{key}")
        if value and isinstance(value, (dict, list)):
            check_for_secrets(value, f"{path}.{key}" if path else key, visited)


@dataclass
class MCPAuditEvent:
    event_id: str
    event_type: MCPAuditEventType
    schema_version: int
    occurred_at: str
    producer: str
    correlation_id: Optional[str] = None
    causation_id: Optional[str] = None
    actor_type: Literal["user", "service", "system"] = "user"
    actor_id: str = ""
    action: str = ""
    resource_type: str = ""
    resource_id: Optional[str] = None
    policy_result: Literal["allowed", "denied", "step_up", "error"] = "allowed"
    policy_version: int = 1
    execution_status: Literal["pending", "succeeded", "failed", "compensated"] = "pending"
    verification_type: Literal["none", "signature", "receipt", "external", "human"] = "none"
    evidence_ref: Optional[str] = None
    payload: Dict[str, Any] = None
    previous_hash: Optional[str] = None
    row_hash: Optional[str] = None


@dataclass
class MCPAuditContext:
    event_type: MCPAuditEventType
    producer: str
    correlation_id: Optional[str] = None
    causation_id: Optional[str] = None
    actor_type: Literal["user", "service", "system"] = "user"
    actor_id: str = ""
    action: str = ""
    resource_type: str = ""
    resource_id: Optional[str] = None
    policy_result: Literal["allowed", "denied", "step_up", "error"] = "allowed"
    policy_version: int = 1
    execution_status: Literal["pending", "succeeded", "failed", "compensated"] = "pending"
    verification_type: Literal["none", "signature", "receipt", "external", "human"] = "none"
    evidence_ref: Optional[str] = None
    payload: Dict[str, Any] = None


def validate_mcp_audit_event(event: Dict[str, Any]) -> MCPAuditEvent:
    validated = dict(event)
    
    if not validated.get("event_id") or not isinstance(validated["event_id"], str):
        raise ValueError("event_id is required")
    if not is_valid_uuid(validated["event_id"]):
        raise ValueError("event_id must be a valid UUID")
    if not validated.get("event_type") or not isinstance(validated["event_type"], str):
        raise ValueError("event_type is required")
    if validated["event_type"] not in MCP_AUDIT_EVENT_TYPE_VALUES:
        raise ValueError(f"Invalid event_type: {validated['event_type']}")
    if not validated.get("producer") or not isinstance(validated["producer"], str):
        raise ValueError("producer is required")
    if not validated.get("actor_type") or validated["actor_type"] not in ("user", "service", "system"):
        raise ValueError("actor_type must be 'user', 'service', or 'system'")
    if not validated.get("actor_id") or not isinstance(validated["actor_id"], str):
        raise ValueError("actor_id is required")
    if not validated.get("action") or not isinstance(validated["action"], str):
        raise ValueError("action is required")
    if not validated.get("resource_type") or not isinstance(validated["resource_type"], str):
        raise ValueError("resource_type is required")
    if not validated.get("policy_result") or validated["policy_result"] not in ("allowed", "denied", "step_up", "error"):
        raise ValueError("policy_result must be 'allowed', 'denied', 'step_up', or 'error'")
    if not isinstance(validated.get("policy_version"), int) or validated["policy_version"] < 1:
        raise ValueError("policy_version must be a positive integer")
    if not validated.get("execution_status") or validated["execution_status"] not in ("pending", "succeeded", "failed", "compensated"):
        raise ValueError("execution_status must be 'pending', 'succeeded', 'failed', or 'compensated'")
    if not validated.get("verification_type") or validated["verification_type"] not in ("none", "signature", "receipt", "external", "human"):
        raise ValueError("verification_type must be 'none', 'signature', 'receipt', 'external', or 'human'")
    if not validated.get("occurred_at") or not isinstance(validated["occurred_at"], str):
        raise ValueError("occurred_at is required")
    if not is_valid_iso8601(validated["occurred_at"]):
        raise ValueError("occurred_at must be a valid ISO 8601 timestamp")
    
    # Default payload to empty object if not provided
    if not validated.get("payload") or not isinstance(validated["payload"], dict) or isinstance(validated["payload"], list):
        validated["payload"] = {}
    if isinstance(validated["payload"], dict):
        check_for_secrets(validated["payload"])
    
    # Set default schema_version if not provided
    if not isinstance(validated.get("schema_version"), int):
        validated["schema_version"] = 1
    
    if "previous_hash" in validated and validated["previous_hash"] is not None:
        if not isinstance(validated["previous_hash"], str) or not is_valid_hex(validated["previous_hash"]):
            raise ValueError("previous_hash must be a valid hex string if provided")
    if "row_hash" in validated and validated["row_hash"] is not None:
        if not isinstance(validated["row_hash"], str) or not is_valid_hex(validated["row_hash"]):
            raise ValueError("row_hash must be a valid hex string if provided")
    
    return MCPAuditEvent(
        event_id=validated["event_id"],
        event_type=validated["event_type"],
        schema_version=validated["schema_version"],
        occurred_at=validated["occurred_at"],
        producer=validated["producer"],
        correlation_id=validate_optional_string(validated.get("correlation_id"), "correlation_id"),
        causation_id=validate_optional_string(validated.get("causation_id"), "causation_id"),
        actor_type=validated["actor_type"],
        actor_id=validated["actor_id"],
        action=validated["action"],
        resource_type=validated["resource_type"],
        resource_id=validate_optional_string(validated.get("resource_id"), "resource_id"),
        policy_result=validated["policy_result"],
        policy_version=validated["policy_version"],
        execution_status=validated["execution_status"],
        verification_type=validated["verification_type"],
        evidence_ref=validate_optional_string(validated.get("evidence_ref"), "evidence_ref"),
        payload=validated["payload"],
        previous_hash=validate_optional_string(validated.get("previous_hash"), "previous_hash"),
        row_hash=validate_optional_string(validated.get("row_hash"), "row_hash"),
    )