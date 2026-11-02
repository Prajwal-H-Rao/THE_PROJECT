/**
 * MCP call validation helpers.
 * Provides UUID/ISO 8601 validation, optional string handling, error code
 * validation, and MCP error validation. Used by call-validate.ts.
 * Error codes live in errors.ts.
 */

import type { MCPErrorCode } from "./errors.js";
import { MCPErrorCodeValues } from "./errors.js";
import { isValidUUID, isValidISO8601, validateOptionalString } from "./mcp-helpers.js";

/** Validate that an error code is a member of MCPErrorCodeValues. Returns a type guard. */
function isValidErrorCode(code: string): code is MCPErrorCode {
  return MCPErrorCodeValues.includes(code as MCPErrorCode);
}

/** Validate and narrow an error object to MCPError. Throws when malformed. */
function validateMCPError(error: unknown): asserts error is import("./errors.js").MCPError {
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
  if (
    err.details !== undefined &&
    (typeof err.details !== "object" || err.details === null || Array.isArray(err.details))
  ) {
    throw new Error("error.details must be an object if provided");
  }
  if (err.correlation_id !== undefined && typeof err.correlation_id !== "string") {
    throw new Error("error.correlation_id must be a string if provided");
  }
}

export { isValidUUID, isValidISO8601, validateOptionalString, validateMCPError };
export { isValidErrorCode };
