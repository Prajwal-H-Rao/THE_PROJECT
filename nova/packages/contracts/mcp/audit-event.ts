/**
 * MCP audit event validation.
 * Validates a raw MCP audit event object against KNOWN_MCP_AUDIT_EVENT_FIELDS
 * and returns a typed MCPAuditEvent. Unknown fields are rejected. Payloads
 * are scanned for forbidden secret keys. Helper functions live in
 * audit-helpers.ts; type definitions live in audit-types.ts.
 */

import type {
  MCPAuditEvent,
  MCPAuditEventType,
  MCPPolicyResult,
  MCPExecutionStatus,
  MCPVerificationType,
} from "./audit-types.js";
import {
  MCPPolicyResultValues,
  MCPExecutionStatusValues,
  MCPVerificationTypeValues,
} from "./audit-types.js";
import {
  isValidUUID,
  isValidISO8601,
  isValidHex,
  validateOptionalString,
  checkForSecrets,
  KNOWN_MCP_AUDIT_EVENT_FIELDS,
} from "./audit-helpers.js";

// Valid MCP audit event types (mirrors MCPAuditEventTypeValues in audit-types.ts).
// Defined locally as a Set to avoid TypeScript eliding a readonly const array import.
const VALID_EVENT_TYPES = new Set([
  "mcp.call.allowed",
  "mcp.call.denied",
  "mcp.call.executed",
  "mcp.call.failed",
  "mcp.approval.granted",
  "mcp.approval.revoked",
  "mcp.approval.expired",
]);

/** Validate a raw MCP audit event object against known fields.
 * Returns a typed MCPAuditEvent. Unknown fields are rejected. Payloads
 * are scanned for forbidden secret keys. Helper functions live in
 * audit-helpers.ts; type definitions live in audit-types.ts. */
export function validate_mcp_audit_event(event: Record<string, unknown>): MCPAuditEvent {
  const validated = { ...event } as Record<string, unknown>;

  for (const key of Object.keys(validated)) {
    if (!KNOWN_MCP_AUDIT_EVENT_FIELDS.has(key)) {
      throw new Error(`Unknown field in MCP audit event: ${key}`);
    }
  }

  if (!validated.event_id || typeof validated.event_id !== "string") {
    throw new Error("event_id is required");
  }
  if (!isValidUUID(validated.event_id)) {
    throw new Error("event_id must be a valid UUID");
  }
  if (!validated.event_type || typeof validated.event_type !== "string") {
    throw new Error("event_type is required");
  }
  if (!VALID_EVENT_TYPES.has(validated.event_type)) {
    throw new Error(`Invalid event_type: ${validated.event_type}`);
  }
  if (!validated.producer || typeof validated.producer !== "string") {
    throw new Error("producer is required");
  }
  if (!validated.actor_type || !["user", "service", "system"].includes(validated.actor_type as string)) {
    throw new Error("actor_type must be 'user', 'service', or 'system'");
  }
  if (!validated.actor_id || typeof validated.actor_id !== "string") {
    throw new Error("actor_id is required");
  }
  if (!validated.action || typeof validated.action !== "string") {
    throw new Error("action is required");
  }
  if (!validated.resource_type || typeof validated.resource_type !== "string") {
    throw new Error("resource_type is required");
  }
  if (!validated.policy_result || !MCPPolicyResultValues.includes(validated.policy_result as MCPPolicyResult)) {
    throw new Error(`policy_result must be one of: ${MCPPolicyResultValues.join(", ")}`);
  }
  if (typeof validated.policy_version !== "number" || validated.policy_version < 1) {
    throw new Error("policy_version must be a positive integer");
  }
  if (!validated.execution_status || !MCPExecutionStatusValues.includes(validated.execution_status as MCPExecutionStatus)) {
    throw new Error(`execution_status must be one of: ${MCPExecutionStatusValues.join(", ")}`);
  }
  if (!validated.verification_type || !MCPVerificationTypeValues.includes(validated.verification_type as MCPVerificationType)) {
    throw new Error(`verification_type must be one of: ${MCPVerificationTypeValues.join(", ")}`);
  }
  if (!validated.occurred_at || typeof validated.occurred_at !== "string") {
    throw new Error("occurred_at is required");
  }
  if (!isValidISO8601(validated.occurred_at)) {
    throw new Error("occurred_at must be a valid ISO 8601 timestamp");
  }
  if (!validated.payload || typeof validated.payload !== "object" || Array.isArray(validated.payload)) {
    validated.payload = {};
  }
  if (typeof validated.payload === "object" && !Array.isArray(validated.payload)) {
    checkForSecrets(validated.payload);
  }
  if (typeof validated.schema_version !== "number") {
    validated.schema_version = 1;
  }
  if (validated.previous_hash !== undefined) {
    if (typeof validated.previous_hash !== "string" || !isValidHex(validated.previous_hash)) {
      throw new Error("previous_hash must be a valid hex string if provided");
    }
  }
  if (validated.row_hash !== undefined) {
    if (typeof validated.row_hash !== "string" || !isValidHex(validated.row_hash)) {
      throw new Error("row_hash must be a valid hex string if provided");
    }
  }

  return {
    event_id: validated.event_id as string,
    event_type: validated.event_type as MCPAuditEventType,
    schema_version: validated.schema_version as number,
    occurred_at: validated.occurred_at as string,
    producer: validated.producer as string,
    correlation_id: validateOptionalString(validated.correlation_id, "correlation_id"),
    causation_id: validateOptionalString(validated.causation_id, "causation_id"),
    actor_type: validated.actor_type as "user" | "service" | "system",
    actor_id: validated.actor_id as string,
    action: validated.action as string,
    resource_type: validated.resource_type as string,
    resource_id: validateOptionalString(validated.resource_id, "resource_id"),
    policy_result: validated.policy_result as MCPPolicyResult,
    policy_version: validated.policy_version as number,
    execution_status: validated.execution_status as MCPExecutionStatus,
    verification_type: validated.verification_type as MCPVerificationType,
    evidence_ref: validateOptionalString(validated.evidence_ref, "evidence_ref"),
    payload: validated.payload as Record<string, unknown>,
    previous_hash: validateOptionalString(validated.previous_hash, "previous_hash"),
    row_hash: validateOptionalString(validated.row_hash, "row_hash"),
  };
}
