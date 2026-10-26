"""Python mirror of call.ts for cross-language contract parity."""

import re
from dataclasses import dataclass
from typing import Any, Dict, List, Literal, Optional

MCPErrorCode = Literal[
    "unauthenticated", "unauthorized", "forbidden", "invalid_token", "token_expired",
    "wrong_audience", "tool_not_found", "invalid_arguments", "invalid_idempotency_key",
    "idempotency_conflict", "tool_timeout", "tool_execution_failed", "approval_required",
    "approval_expired", "approval_revoked", "policy_denied", "rate_limited",
    "quota_exceeded", "internal_error", "service_unavailable", "validation_failed",
    "schema_mismatch", "circuit_open", "dependency_failed",
]

MCP_ERROR_CODE_VALUES: List[MCPErrorCode] = [
    "unauthenticated", "unauthorized", "forbidden", "invalid_token", "token_expired",
    "wrong_audience", "tool_not_found", "invalid_arguments", "invalid_idempotency_key",
    "idempotency_conflict", "tool_timeout", "tool_execution_failed", "approval_required",
    "approval_expired", "approval_revoked", "policy_denied", "rate_limited",
    "quota_exceeded", "internal_error", "service_unavailable", "validation_failed",
    "schema_mismatch", "circuit_open", "dependency_failed",
]

# UUID regex accepting all RFC 4122 versions (v1-v5, v7)
UUID_REGEX = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE)


def is_valid_uuid(s: str) -> bool:
    return bool(UUID_REGEX.match(s))


def is_valid_iso8601(s: str) -> bool:
    from datetime import datetime
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        # Round-trip check
        return dt.isoformat().replace("+00:00", "Z") == s or dt.isoformat() == s
    except Exception:
        return False


def is_valid_error_code(code: str) -> bool:
    return code in MCP_ERROR_CODE_VALUES


def validate_optional_string(val: Any, field_name: str) -> Optional[str]:
    if val is None:
        return None
    if not isinstance(val, str):
        raise ValueError(f"{field_name} must be a string if provided")
    return val


def validate_mcp_error(error: Any) -> None:
    if not error or not isinstance(error, dict):
        raise ValueError("error must be an object")
    if "code" not in error or not isinstance(error["code"], str):
        raise ValueError("error.code is required and must be a string")
    if not is_valid_error_code(error["code"]):
        raise ValueError(f"Invalid error code: {error['code']}")
    if "message" not in error or not isinstance(error["message"], str):
        raise ValueError("error.message is required and must be a string")
    if "details" in error and error["details"] is not None:
        if not isinstance(error["details"], dict) or isinstance(error["details"], list):
            raise ValueError("error.details must be an object if provided")
    if "correlation_id" in error and error["correlation_id"] is not None:
        if not isinstance(error["correlation_id"], str):
            raise ValueError("error.correlation_id must be a string if provided")


@dataclass
class MCPCall:
    call_id: str
    tool: str
    arguments: Dict[str, Any]
    idempotency_key: Optional[str] = None
    service_jwt: Optional[str] = None
    user_id: Optional[str] = None
    correlation_id: Optional[str] = None
    created_at: str = ""


@dataclass
class MCPResponse:
    call_id: str
    ok: bool
    result: Optional[Dict[str, Any]] = None
    error: Optional[Dict[str, Any]] = None
    completed_at: str = ""
    correlation_id: Optional[str] = None
    protocol_version: str = ""


@dataclass
class MCPCallContext:
    call: MCPCall
    tool_definition: Any  # ToolDefinition from tool.py
    user_id: str
    roles: List[str]
    scopes: List[str]
    approval_grant: Optional[str] = None


def validate_mcp_call(call: Dict[str, Any]) -> MCPCall:
    validated = dict(call)
    
    if not validated.get("call_id") or not isinstance(validated["call_id"], str):
        raise ValueError("call_id is required")
    if not is_valid_uuid(validated["call_id"]):
        raise ValueError("call_id must be a valid UUID")
    if not validated.get("tool") or not isinstance(validated["tool"], str):
        raise ValueError("tool is required")
    if not validated.get("arguments") or not isinstance(validated["arguments"], dict):
        raise ValueError("arguments must be an object")
    if isinstance(validated["arguments"], list):
        raise ValueError("arguments must be an object, not an array")
    if not validated.get("created_at") or not isinstance(validated["created_at"], str):
        raise ValueError("created_at is required")
    if not is_valid_iso8601(validated["created_at"]):
        raise ValueError("created_at must be a valid ISO 8601 timestamp")
    
    return MCPCall(
        call_id=validated["call_id"],
        tool=validated["tool"],
        arguments=validated["arguments"],
        idempotency_key=validate_optional_string(validated.get("idempotency_key"), "idempotency_key"),
        service_jwt=validate_optional_string(validated.get("service_jwt"), "service_jwt"),
        user_id=validate_optional_string(validated.get("user_id"), "user_id"),
        correlation_id=validate_optional_string(validated.get("correlation_id"), "correlation_id"),
        created_at=validated["created_at"],
    )


def validate_mcp_response(response: Dict[str, Any]) -> MCPResponse:
    validated = dict(response)
    
    if not validated.get("call_id") or not isinstance(validated["call_id"], str):
        raise ValueError("call_id is required")
    if not is_valid_uuid(validated["call_id"]):
        raise ValueError("call_id must be a valid UUID")
    if not isinstance(validated.get("ok"), bool):
        raise ValueError("ok must be a boolean")
    if validated["ok"] and not validated.get("result"):
        raise ValueError("result is required when ok is true")
    if validated["ok"] and (not isinstance(validated["result"], dict) or isinstance(validated["result"], list) or validated["result"] is None):
        raise ValueError("result must be an object when ok is true")
    if not validated["ok"] and not validated.get("error"):
        raise ValueError("error is required when ok is false")
    if not validated["ok"]:
        validate_mcp_error(validated["error"])
    if not validated.get("completed_at") or not isinstance(validated["completed_at"], str):
        raise ValueError("completed_at is required")
    if not is_valid_iso8601(validated["completed_at"]):
        raise ValueError("completed_at must be a valid ISO 8601 timestamp")
    if not validated.get("protocol_version") or not isinstance(validated["protocol_version"], str):
        raise ValueError("protocol_version is required")
    
    return MCPResponse(
        call_id=validated["call_id"],
        ok=validated["ok"],
        result=validated.get("result"),
        error=validated.get("error"),
        completed_at=validated["completed_at"],
        correlation_id=validate_optional_string(validated.get("correlation_id"), "correlation_id"),
        protocol_version=validated["protocol_version"],
    )