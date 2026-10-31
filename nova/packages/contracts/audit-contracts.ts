/** The audit service contracts. Shared types for recording audit events. */

export type ActorType = "user" | "service" | "system";
export type PolicyResult = "allowed" | "denied" | "step_up" | "error" | "not_evaluated" | "approval_required";
export type ExecutionStatus = "pending" | "succeeded" | "failed" | "compensated" | "planned" | "awaiting_approval" | "approved" | "executing" | "cancelled" | "needs_manual_action";
export type VerificationType = "none" | "signature" | "receipt" | "external" | "human";

/** Denial reason codes. Extensible for Layer 8+ sources. */
export type DenialCode =
  | "identity_required"
  | "ownership_mismatch"
  | "quota_exceeded"
  | "no_matching_rule"
  | "invalid_request"
  | "chat_approval_not_allowed"
  | "chat_approval_requires_standard_flow"
  | "authorization_failed"
  | "tool_not_found"
  | "missing_scope"
  | "approval_required"
  | "approval_revoked"
  | "validation_failed"
  | "wrong_audience"
  | "quota_exceeded"
  | "internal_error"
  | "service_unavailable"
  | "circuit_open"
  | "dependency_failed"
  | "schema_mismatch"
  | "action_mismatch"
  | "insufficient_scope"
  | "policy_version_mismatch"
  | "already_used"
  | "expired"
  | "revoked"
  | "free_text_not_allowed"
  | "approval_revoked"
  | "approval_required"
  | "body_too_large"
  | "unknown_family"
  | "invalid_json"
  | "validation_failed";

/** Input for recording an audit event. */
export interface AuditRecordInput {
  readonly actorType: ActorType;
  readonly actorId: string;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId?: string;
  readonly policyResult: PolicyResult;
  readonly policyVersion: string | number;
  readonly correlationId: string;
  readonly executionStatus?: ExecutionStatus;
  readonly verificationType?: VerificationType;
  readonly evidenceRef?: string;
  readonly payload?: Record<string, unknown>;
  readonly dedupeKey?: string;
  /** Required when policyResult === "denied". The specific denial reason code. */
  readonly denialCode?: DenialCode;
}

/** The stored audit record. */
export interface AuditRecord {
  readonly auditId: string;
  readonly occurredAt: string;
  readonly actorType: ActorType;
  readonly actorId: string;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId?: string;
  readonly policyResult: PolicyResult;
  readonly denialCode?: DenialCode;
  readonly executionStatus: ExecutionStatus;
  readonly verificationType: VerificationType;
  readonly evidenceRef?: string;
  readonly payload: Record<string, unknown>;
  readonly previousHash?: string;
  readonly rowHash: string;
  readonly dedupeKey?: string;
}

/** HTTP response for audit recording. */
export interface AuditRecordResponse {
  readonly ok: true;
  readonly auditId: string;
  readonly rowHash: string;
}

/** Error response for audit recording. */
export interface AuditRecordError {
  readonly ok: false;
  readonly error: string;
  readonly message: string;
}

/** Storage contract for audit records. */
export interface AuditRepository {
  /** Record an audit event. Returns the audit ID and row hash. */
  record(input: AuditRecordInput): Promise<AuditRecordResponse>;
  /** Find audit records by query. */
  find(query: AuditQuery): Promise<AuditRecord[]>;
}

/** Query parameters for finding audit records. */
export interface AuditQuery {
  readonly actorType?: ActorType;
  readonly actorId?: string;
  readonly action?: string;
  readonly resourceType?: string;
  readonly resourceId?: string;
  readonly policyResult?: PolicyResult;
  readonly from?: string;
  readonly to?: string;
  readonly limit?: number;
  readonly offset?: number;
}