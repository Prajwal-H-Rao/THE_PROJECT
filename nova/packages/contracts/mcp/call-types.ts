/**
 * MCP call and response types.
 * Defines MCPCall, MCPResponse, MCPCallContext interfaces and the known
 * field sets for call and response objects. Validation logic lives in
 * call-helpers.ts and call-validate.ts.
 */

export const KNOWN_MCP_CALL_FIELDS = new Set([
  "call_id",
  "tool",
  "arguments",
  "idempotency_key",
  "service_jwt",
  "user_id",
  "correlation_id",
  "created_at",
]);

export const KNOWN_MCP_RESPONSE_FIELDS = new Set([
  "call_id",
  "ok",
  "result",
  "error",
  "completed_at",
  "correlation_id",
  "protocol_version",
]);

export interface MCPCall {
  call_id: string;
  tool: string;
  arguments: Record<string, unknown>;
  idempotency_key?: string;
  service_jwt?: string;
  user_id?: string;
  correlation_id?: string;
  created_at: string;
  approval_grant?: string;
}

export interface MCPResponse {
  call_id: string;
  ok: boolean;
  result?: Record<string, unknown>;
  error?: import("./errors.js").MCPError;
  completed_at: string;
  correlation_id?: string;
  protocol_version: string;
}

export interface MCPCallContext {
  call: MCPCall;
  tool_definition: import("./tool.js").ToolDefinition;
  user_id: string;
  roles: string[];
  scopes: string[];
  approval_grant?: string;
}
