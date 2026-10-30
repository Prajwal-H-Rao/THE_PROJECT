/** MCP call and response wire contracts. */

import { MCPError, MCPErrorCode, MCPErrorCodeValues } from "./errors.js";

export { MCPError, MCPErrorCode, MCPErrorCodeValues } from "./errors.js";

// UUID regex accepting all RFC 4122 versions (v1-v5, v7)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(str: string): boolean {
  return UUID_REGEX.test(str);
}

// ISO 8601 / RFC 3339 timestamp validation accepting common formats
function isValidISO8601(str: string): boolean {
  const date = new Date(str);
  if (isNaN(date.getTime())) {
    return false;
  }
  // Accept any format that Date.parse accepts and round-trips
  try {
    return new Date(str).getTime() === date.getTime();
  } catch {
    return false;
  }
}

function isValidErrorCode(code: string): code is MCPErrorCode {
  return MCPErrorCodeValues.includes(code as MCPErrorCode);
}

function validateOptionalString(val: unknown, fieldName: string): string | undefined {
  if (val === undefined || val === null) {
    return undefined;
  }
  if (typeof val !== "string") {
    throw new Error(`${fieldName} must be a string if provided`);
  }
  return val;
}

function validateMCPError(error: unknown): asserts error is MCPError {
  if (!error || typeof error !== "object") {
    throw new Error("error must be an object");
  }
  const err = error as Record<string, unknown>;
  if (!err.code || typeof err.code !== "string") {
    throw new Error("error.code is required and must be a string");
  }
  if (!isValidErrorCode(err.code)) {
    throw new Error(`Invalid error code: ${err.code}`);
  }
  if (!err.message || typeof err.message !== "string") {
    throw new Error("error.message is required and must be a string");
  }
  if (err.details !== undefined && (typeof err.details !== "object" || err.details === null || Array.isArray(err.details))) {
    throw new Error("error.details must be an object if provided");
  }
  if (err.correlation_id !== undefined && typeof err.correlation_id !== "string") {
    throw new Error("error.correlation_id must be a string if provided");
  }
}

const KNOWN_MCP_CALL_FIELDS = new Set([
  "call_id",
  "tool",
  "arguments",
  "idempotency_key",
  "service_jwt",
  "user_id",
  "correlation_id",
  "created_at",
]);

const KNOWN_MCP_RESPONSE_FIELDS = new Set([
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
  error?: MCPError;
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

export function validate_mcp_call(call: Record<string, unknown>): MCPCall {
  // Create a shallow copy to avoid mutating caller's object
  const validated = { ...call } as Record<string, unknown>;

  // Unknown-field rejection (spec:167)
  for (const key of Object.keys(validated)) {
    if (!KNOWN_MCP_CALL_FIELDS.has(key)) {
      throw new Error(`Unknown field in MCP call: ${key}`);
    }
  }

  if (!validated.call_id || typeof validated.call_id !== "string") {
    throw new Error("call_id is required");
  }
  if (!isValidUUID(validated.call_id)) {
    throw new Error("call_id must be a valid UUID");
  }
  if (!validated.tool || typeof validated.tool !== "string") {
    throw new Error("tool is required");
  }
  if (!validated.arguments || typeof validated.arguments !== "object") {
    throw new Error("arguments must be an object");
  }
  if (Array.isArray(validated.arguments)) {
    throw new Error("arguments must be an object, not an array");
  }
  if (!validated.created_at || typeof validated.created_at !== "string") {
    throw new Error("created_at is required");
  }
  if (!isValidISO8601(validated.created_at)) {
    throw new Error("created_at must be a valid ISO 8601 timestamp");
  }

  // Construct typed object explicitly (no unsafe cast)
  return {
    call_id: validated.call_id as string,
    tool: validated.tool as string,
    arguments: validated.arguments as Record<string, unknown>,
    idempotency_key: validateOptionalString(validated.idempotency_key, "idempotency_key"),
    service_jwt: validateOptionalString(validated.service_jwt, "service_jwt"),
    user_id: validateOptionalString(validated.user_id, "user_id"),
    correlation_id: validateOptionalString(validated.correlation_id, "correlation_id"),
    created_at: validated.created_at as string,
  };
}

export function validate_mcp_response(response: Record<string, unknown>): MCPResponse {
  // Create a shallow copy to avoid mutating caller's object
  const validated = { ...response } as Record<string, unknown>;

  // Unknown-field rejection (spec:167)
  for (const key of Object.keys(validated)) {
    if (!KNOWN_MCP_RESPONSE_FIELDS.has(key)) {
      throw new Error(`Unknown field in MCP response: ${key}`);
    }
  }

  if (!validated.call_id || typeof validated.call_id !== "string") {
    throw new Error("call_id is required");
  }
  if (!isValidUUID(validated.call_id)) {
    throw new Error("call_id must be a valid UUID");
  }
  if (typeof validated.ok !== "boolean") {
    throw new Error("ok must be a boolean");
  }
  if (validated.ok && !validated.result) {
    throw new Error("result is required when ok is true");
  }
  if (validated.ok && (typeof validated.result !== "object" || Array.isArray(validated.result) || validated.result === null)) {
    throw new Error("result must be an object when ok is true");
  }
  if (!validated.ok && !validated.error) {
    throw new Error("error is required when ok is false");
  }
  if (!validated.ok) {
    validateMCPError(validated.error);
  }
  if (!validated.completed_at || typeof validated.completed_at !== "string") {
    throw new Error("completed_at is required");
  }
  if (!isValidISO8601(validated.completed_at)) {
    throw new Error("completed_at must be a valid ISO 8601 timestamp");
  }
  if (!validated.protocol_version || typeof validated.protocol_version !== "string") {
    throw new Error("protocol_version is required");
  }

  // Construct typed object explicitly (no unsafe cast)
  return {
    call_id: validated.call_id as string,
    ok: validated.ok as boolean,
    result: validated.result as Record<string, unknown> | undefined,
    error: validated.error as MCPError | undefined,
    completed_at: validated.completed_at as string,
    correlation_id: validateOptionalString(validated.correlation_id, "correlation_id"),
    protocol_version: validated.protocol_version as string,
  };
}