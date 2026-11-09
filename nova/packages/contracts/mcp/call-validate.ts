/**
 * MCP call and response validation.
 * Validates raw MCP call and response objects against known field sets and
 * returns typed MCPCall / MCPResponse. Helpers live in call-helpers.ts;
 * error codes live in errors.ts.
 */

import type { MCPCall, MCPResponse } from "./call-types.js";
import {
  isValidUUID,
  isValidISO8601,
  validateOptionalString,
  validateMCPError,
} from "./call-helpers.js";
import type { MCPError } from "./errors.js";

const KNOWN_MCP_CALL_FIELDS = new Set([
  "call_id",
  "tool",
  "arguments",
  "idempotency_key",
  "service_jwt",
  "user_id",
  "correlation_id",
  "created_at",
  "approval_grant",
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

/** Validate a raw MCP call object against known fields.
 * Returns a typed MCPCall. Rejects unknown fields. */
export function validate_mcp_call(call: Record<string, unknown>): MCPCall {
  const validated = { ...call } as Record<string, unknown>;

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

/** Validate a raw MCP response object against known fields.
 * Returns a typed MCPResponse. Rejects unknown fields. */
export function validate_mcp_response(response: Record<string, unknown>): MCPResponse {
  const validated = { ...response } as Record<string, unknown>;

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
  if (
    validated.ok &&
    (typeof validated.result !== "object" ||
      Array.isArray(validated.result) ||
      validated.result === null)
  ) {
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
