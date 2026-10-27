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

// Extended policy result per spec:174 (includes workflow states)
export type MCPPolicyResult =
  | "allowed"
  | "denied"
  | "step_up"
  | "error"
  | "not_evaluated"
  | "approval_required";

export const MCPPolicyResultValues: readonly MCPPolicyResult[] = [
  "allowed",
  "denied",
  "step_up",
  "error",
  "not_evaluated",
  "approval_required",
] as const;

// Extended execution status per spec:174 (8 workflow states)
export type MCPExecutionStatus =
  | "pending"
  | "succeeded"
  | "failed"
  | "compensated"
  | "planned"
  | "awaiting_approval"
  | "approved"
  | "executing"
  | "cancelled"
  | "needs_manual_action";

export const MCPExecutionStatusValues: readonly MCPExecutionStatus[] = [
  "pending",
  "succeeded",
  "failed",
  "compensated",
  "planned",
  "awaiting_approval",
  "approved",
  "executing",
  "cancelled",
  "needs_manual_action",
] as const;

export type MCPVerificationType =
  | "none"
  | "signature"
  | "receipt"
  | "external"
  | "human";

export const MCPVerificationTypeValues: readonly MCPVerificationType[] = [
  "none",
  "signature",
  "receipt",
  "external",
  "human",
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
  policy_result: MCPPolicyResult;
  policy_version: number;
  execution_status: MCPExecutionStatus;
  verification_type: MCPVerificationType;
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
  policy_result: MCPPolicyResult;
  policy_version: number;
  execution_status: MCPExecutionStatus;
  verification_type: MCPVerificationType;
  evidence_ref?: string;
  payload: Record<string, unknown>;
}