/** MCP error codes. */

export type MCPErrorCode =
  | "unauthenticated"
  | "unauthorized"
  | "forbidden"
  | "invalid_token"
  | "token_expired"
  | "wrong_audience"
  | "tool_not_found"
  | "invalid_arguments"
  | "invalid_idempotency_key"
  | "idempotency_conflict"
  | "tool_timeout"
  | "tool_execution_failed"
  | "approval_required"
  | "approval_expired"
  | "approval_revoked"
  | "policy_denied"
  | "rate_limited"
  | "quota_exceeded"
  | "internal_error"
  | "service_unavailable"
  | "validation_failed"
  | "schema_mismatch"
  | "circuit_open"
  | "dependency_failed";

export const MCPErrorCodeValues: readonly MCPErrorCode[] = [
  "unauthenticated",
  "unauthorized",
  "forbidden",
  "invalid_token",
  "token_expired",
  "wrong_audience",
  "tool_not_found",
  "invalid_arguments",
  "invalid_idempotency_key",
  "idempotency_conflict",
  "tool_timeout",
  "tool_execution_failed",
  "approval_required",
  "approval_expired",
  "approval_revoked",
  "policy_denied",
  "rate_limited",
  "quota_exceeded",
  "internal_error",
  "service_unavailable",
  "validation_failed",
  "schema_mismatch",
  "circuit_open",
  "dependency_failed",
] as const;

export interface MCPError {
  code: MCPErrorCode;
  message: string;
  details?: Record<string, unknown>;
  correlation_id?: string;
}