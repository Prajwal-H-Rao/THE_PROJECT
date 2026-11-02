/**
 * MCP tool definition validation.
 * Validates a raw tool definition object against KNOWN_TOOL_DEFINITION_FIELDS
 * and returns a typed ToolDefinition. Unknown fields are rejected.
 * Type definitions and constants live in tool-types.ts.
 */

import type {
  ToolDefinition,
  ToolArgumentSchema,
  ToolOutputSchema,
  ToolRiskTier,
  ToolIdempotency,
  ToolClassification,
  CanonicalFamily,
} from "./tool-types.js";
import {
  CanonicalFamilyValues,
  KNOWN_TOOL_DEFINITION_FIELDS,
} from "./tool-types.js";
import { validateOptionalString } from "./mcp-helpers.js";

export { validateOptionalString } from "./mcp-helpers.js";

/** Validate that an object is a schema wrapper with a type of 'object'. */
export function validateSchemaObject(obj: unknown, fieldName: string): void {
  if (!obj || typeof obj !== "object") {
    throw new Error(`${fieldName} must be an object`);
  }
  if (Array.isArray(obj)) {
    throw new Error(`${fieldName} must be an object, not an array`);
  }
  const wrapper = obj as Record<string, unknown>;
  const schema = wrapper.schema as Record<string, unknown> | undefined;
  if (!schema || schema.type !== "object") {
    throw new Error(`${fieldName}.schema.type must be 'object'`);
  }
}

/** Validate that a value is an array containing only strings. */
export function validateStringArray(arr: unknown, fieldName: string): void {
  if (!Array.isArray(arr)) {
    throw new Error(`${fieldName} must be an array`);
  }
  for (const item of arr) {
    if (typeof item !== "string") {
      throw new Error(`${fieldName} must contain only strings`);
    }
  }
}

/** Validate that a value is a positive integer. */
export function validatePositiveInteger(num: unknown, fieldName: string): void {
  if (typeof num !== "number" || !Number.isInteger(num) || num < 1) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
}

/** Validate that a string is an ISO 8601 duration. */
export function validateISO8601Duration(str: unknown, fieldName: string): void {
  if (typeof str !== "string") {
    throw new Error(`${fieldName} must be a string`);
  }
  if (!/^P(?:\d+Y)?(?:\d+M)?(?:\d+D)?(?:T(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?)?$/.test(str)) {
    throw new Error(`${fieldName} must be a valid ISO 8601 duration`);
  }
}

/** Validate a raw tool definition object and return a typed ToolDefinition.
 * Rejects unknown fields and enforces all required field types and formats. */
export function validate_tool_definition(def: Record<string, unknown>): ToolDefinition {
  const validated = { ...def } as Record<string, unknown>;

  for (const key of Object.keys(validated)) {
    if (!KNOWN_TOOL_DEFINITION_FIELDS.has(key)) {
      throw new Error(`Unknown field in tool definition: ${key}`);
    }
  }

  if (!validated.name || typeof validated.name !== "string") {
    throw new Error("Tool name is required");
  }
  if (!/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/.test(validated.name)) {
    throw new Error("Tool name must be in 'family.action' format");
  }
  if (!validated.description || typeof validated.description !== "string") {
    throw new Error("Tool description is required");
  }
  if (!validated.arguments || typeof validated.arguments !== "object") {
    throw new Error("Tool arguments schema is required");
  }
  if (Array.isArray(validated.arguments)) {
    throw new Error("Tool arguments schema must be an object, not an array");
  }
  if (!validated.output || typeof validated.output !== "object") {
    throw new Error("Tool output schema is required");
  }
  if (Array.isArray(validated.output)) {
    throw new Error("Tool output schema must be an object, not an array");
  }
  validateSchemaObject(validated.arguments, "arguments");
  validateSchemaObject(validated.output, "output");

  if (validated.classification !== "read" && validated.classification !== "write") {
    throw new Error("Classification must be 'read' or 'write'");
  }
  if (!validated.risk_tier) {
    validated.risk_tier = validated.classification === "read" ? "tier1" : "tier2";
  }
  if (!["tier1", "tier2", "tier3", "tier4"].includes(validated.risk_tier as string)) {
    throw new Error("Risk tier must be tier1, tier2, tier3, or tier4");
  }
  if (!validated.idempotency) {
    validated.idempotency = "none";
  }
  if (!["none", "idempotency_key", "natural"].includes(validated.idempotency as string)) {
    throw new Error("Idempotency must be 'none', 'idempotency_key', or 'natural'");
  }
  if (validated.allowed_roles) {
    const validRoles = ["admin", "user", "viewer"];
    validateStringArray(validated.allowed_roles, "allowed_roles");
    for (const role of validated.allowed_roles as string[]) {
      if (!validRoles.includes(role)) {
        throw new Error(`Invalid role: ${role}. Valid: ${validRoles.join(", ")}`);
      }
    }
  }
  if (validated.allowed_scopes) {
    validateStringArray(validated.allowed_scopes, "allowed_scopes");
  }
  if (validated.provider_allowlist) {
    validateStringArray(validated.provider_allowlist, "provider_allowlist");
  }
  if (validated.timeout) {
    validateISO8601Duration(validated.timeout, "timeout");
  }
  if (validated.quota && !/^\d+\/(s|m|h|hour|d)$/i.test(validated.quota as string)) {
    throw new Error("Quota must be in format 'N/s', 'N/m', 'N/h', 'N/hour', or 'N/d'");
  }
  if (validated.verifier !== undefined && typeof validated.verifier !== "string") {
    throw new Error("verifier must be a string");
  }
  if (!validated.verifier || typeof validated.verifier !== "string") {
    throw new Error("Verifier is required and must be a string");
  }
  if (!validated.family || !CanonicalFamilyValues.includes(validated.family as CanonicalFamily)) {
    throw new Error(`Family is required and must be one of: ${CanonicalFamilyValues.join(", ")}`);
  }
  if (!validated.operation_id || typeof validated.operation_id !== "string") {
    throw new Error("Operation ID is required and must be a string");
  }
  if (!validated.owning_service || typeof validated.owning_service !== "string") {
    throw new Error("Owning service is required and must be a string");
  }
  if (!validated.mcp_server || typeof validated.mcp_server !== "string") {
    throw new Error("MCP server is required and must be a string");
  }
  if (!validated.resource_scope || typeof validated.resource_scope !== "string") {
    throw new Error("Resource scope is required and must be a string");
  }
  validatePositiveInteger(validated.version, "version");

  return {
    name: validated.name as string,
    description: validated.description as string,
    arguments: validated.arguments as { schema: Record<string, unknown> },
    output: validated.output as { schema: Record<string, unknown> },
    allowed_roles: validated.allowed_roles as string[] | undefined,
    allowed_scopes: validated.allowed_scopes as string[] | undefined,
    classification: validated.classification as ToolClassification,
    risk_tier: validated.risk_tier as ToolRiskTier,
    idempotency: validated.idempotency as ToolIdempotency,
    timeout: validateOptionalString(validated.timeout, "timeout"),
    version: validated.version as number,
    provider_allowlist: validated.provider_allowlist as string[] | undefined,
    quota: validated.quota as string | undefined,
    verifier: validated.verifier as string,
    family: validated.family as CanonicalFamily,
    operation_id: validated.operation_id as string,
    owning_service: validated.owning_service as string,
    mcp_server: validated.mcp_server as string,
    resource_scope: validated.resource_scope as string,
  };
}
