/** Bulk decision types and validation (Task 14). */

import { PolicyDecisionRequest, validateDecisionRequest } from "./policy-schema.js";

/** Single request within a bulk decision. */
export interface BulkDecisionRequestItem {
  readonly actor: string;
  readonly scope: string;
  readonly action: string;
  readonly target: string;
  readonly sensitivity?: "low" | "medium" | "high" | "critical";
  readonly payloadHash?: string;
}

/** Request for bulk policy decision (Task 14). */
export interface BulkDecisionRequest {
  readonly items: readonly BulkDecisionRequestItem[];
}

/** Result for one item in a bulk decision. */
export interface BulkDecisionItemResult {
  readonly index: number;
  readonly decision: "allow" | "deny" | "needs_approval";
  readonly ruleId: string;
  readonly reason?: string;
  readonly approvalRequired?: {
    readonly payloadHash: string;
    readonly expirySeconds: number;
    readonly nonce: string;
    readonly requiresStepUp?: boolean;
  };
  readonly chatApprovalAllowed?: boolean;
  readonly chatApprovalReason?: string;
}

/** Response for bulk policy decision (Task 14). */
export interface BulkDecisionResponse {
  readonly decision: "allow" | "deny" | "needs_approval";
  readonly policyVersion: number;
  readonly reason?: string;
  readonly items: readonly BulkDecisionItemResult[];
  /** True if the batch contains any escalation action (new source, application submit). */
  readonly hasEscalation: boolean;
}

/** Validate a bulk decision request. */
export function validateBulkDecisionRequest(req: unknown): req is BulkDecisionRequest {
  if (typeof req !== "object" || req === null) {
    return false;
  }
  const r = req as Record<string, unknown>;
  if (!("items" in r) || !Array.isArray(r.items)) {
    return false;
  }
  if (r.items.length === 0) {
    return false;
  }
  for (const item of r.items) {
    if (!validateDecisionRequest(item)) {
      return false;
    }
  }
  return true;
}