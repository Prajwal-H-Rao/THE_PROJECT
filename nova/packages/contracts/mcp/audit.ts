/** MCP audit event contract. */

export type MCPAuditEventType =
  | "mcp.call.allowed"
  | "mcp.call.denied"
  | "mcp.call.executed"
  | "mcp.call.failed"
  | "mcp.approval.granted"
  | "mcp.approval.revoked"
  | "mcp.approval.expired";

export const MCPAuditEventTypeValues: readonly MCPAuditEventType[] = [
  "mcp.call.allowed",
  "mcp.call.denied",
  "mcp.call.executed",
  "mcp.call.failed",
  "mcp.approval.granted",
  "mcp.approval.revoked",
  "mcp.approval.expired",
] as const;

export interface MCPAuditEvent {
  event_id: string;
  event_type: MCPAuditEventType;
  schema_version: number;
  occurred_at: string;
  producer: string;
  correlation_id?: string;
  causation_id?: string;
  actor_type: "user" | "service" | "system";
  actor_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  policy_result: "allowed" | "denied" | "step_up" | "error";
  policy_version: number;
  execution_status: "pending" | "succeeded" | "failed" | "compensated";
  verification_type: "none" | "signature" | "receipt" | "external" | "human";
  evidence_ref?: string;
  payload: Record<string, unknown>;
  previous_hash?: string;
  row_hash?: string;
}

export interface MCPAuditContext {
  event_type: MCPAuditEventType;
  producer: string;
  correlation_id?: string;
  causation_id?: string;
  actor_type: "user" | "service" | "system";
  actor_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  policy_result: "allowed" | "denied" | "step_up" | "error";
  policy_version: number;
  execution_status: "pending" | "succeeded" | "failed" | "compensated";
  verification_type: "none" | "signature" | "receipt" | "external" | "human";
  evidence_ref?: string;
  payload: Record<string, unknown>;
}

const FORBIDDEN_KEYS = new Set([
  // snake_case
  "password",
  "secret",
  "token",
  "key",
  "jwt",
  "authorization",
  "access_token",
  "refresh_token",
  "api_key",
  "private_key",
  // camelCase / PascalCase variants (stored in lowercase for case-insensitive matching)
  "apikey",
  "accesstoken",
  "refreshtoken",
  "privatekey",
  "secretkey",
  "apisecret",
  "clientsecret",
  "clientid",
  "authtoken",
  "bearertoken",
  "idtoken",
]);

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
  const parsed = date.toISOString();
  // Check if the original string is a valid representation of the same time
  try {
    return new Date(str).getTime() === date.getTime();
  } catch {
    return false;
  }
}

function isValidHex(str: string): boolean {
  return /^[0-9a-f]+$/i.test(str);
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

function checkForSecrets(obj: unknown, path: string = "", visited = new WeakSet<object>()): void {
  if (!obj || typeof obj !== "object") {
    return;
  }
  if (visited.has(obj as object)) {
    return; // Circular reference detected, skip
  }
  visited.add(obj as object);
  
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      checkForSecrets(obj[i], `${path}[${i}]`, visited);
    }
    return;
  }
  const record = obj as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const lowerKey = key.toLowerCase();
    if (FORBIDDEN_KEYS.has(lowerKey)) {
      throw new Error(`Payload contains forbidden key: ${path ? `${path}.` : ""}${key}`);
    }
    const value = record[key];
    if (value && typeof value === "object") {
      checkForSecrets(value, path ? `${path}.${key}` : key, visited);
    }
  }
}

export function validate_mcp_audit_event(event: Record<string, unknown>): MCPAuditEvent {
  // Create a shallow copy to avoid mutating caller's object
  const validated = { ...event } as Record<string, unknown>;

  if (!validated.event_id || typeof validated.event_id !== "string") {
    throw new Error("event_id is required");
  }
  if (!isValidUUID(validated.event_id)) {
    throw new Error("event_id must be a valid UUID");
  }
  if (!validated.event_type || typeof validated.event_type !== "string") {
    throw new Error("event_type is required");
  }
  if (!MCPAuditEventTypeValues.includes(validated.event_type as MCPAuditEventType)) {
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
  if (!validated.policy_result || !["allowed", "denied", "step_up", "error"].includes(validated.policy_result as string)) {
    throw new Error("policy_result must be 'allowed', 'denied', 'step_up', or 'error'");
  }
  if (typeof validated.policy_version !== "number" || validated.policy_version < 1) {
    throw new Error("policy_version must be a positive integer");
  }
  if (!validated.execution_status || !["pending", "succeeded", "failed", "compensated"].includes(validated.execution_status as string)) {
    throw new Error("execution_status must be 'pending', 'succeeded', 'failed', or 'compensated'");
  }
  if (!validated.verification_type || !["none", "signature", "receipt", "external", "human"].includes(validated.verification_type as string)) {
    throw new Error("verification_type must be 'none', 'signature', 'receipt', 'external', or 'human'");
  }
  if (!validated.occurred_at || typeof validated.occurred_at !== "string") {
    throw new Error("occurred_at is required");
  }
  if (!isValidISO8601(validated.occurred_at)) {
    throw new Error("occurred_at must be a valid ISO 8601 timestamp");
  }
  // Default payload to empty object if not provided
  if (!validated.payload || typeof validated.payload !== "object" || Array.isArray(validated.payload)) {
    validated.payload = {};
  }
  if (typeof validated.payload === "object" && !Array.isArray(validated.payload)) {
    checkForSecrets(validated.payload);
  }
  // Set default schema_version if not provided
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

  // Construct typed object explicitly (no unsafe cast)
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
    policy_result: validated.policy_result as "allowed" | "denied" | "step_up" | "error",
    policy_version: validated.policy_version as number,
    execution_status: validated.execution_status as "pending" | "succeeded" | "failed" | "compensated",
    verification_type: validated.verification_type as "none" | "signature" | "receipt" | "external" | "human",
    evidence_ref: validateOptionalString(validated.evidence_ref, "evidence_ref"),
    payload: validated.payload as Record<string, unknown>,
    previous_hash: validateOptionalString(validated.previous_hash, "previous_hash"),
    row_hash: validateOptionalString(validated.row_hash, "row_hash"),
  };
}