/** MCP audit event types. */

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