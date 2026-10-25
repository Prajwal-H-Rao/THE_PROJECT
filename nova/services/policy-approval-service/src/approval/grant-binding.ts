/** The approval grant binding. Pure functions that compare a grant record
 *  against a verification attempt. Any material difference denies the grant.
 *  See docs/design-notes/nova-approval-grants.md for the binding semantics. */

import { computeApprovalHash } from "@nova/contracts/approval-hash";

export { computeApprovalHash };

/** The durable grant record. Mirrors the approvals table columns. */
export interface GrantRecord {
  readonly grantId: string;
  readonly userId: string;
  readonly service: string;
  readonly action: string;
  readonly target: string;
  readonly payloadHash: string;
  readonly policyVersion: string;
  readonly nonce: string;
  readonly createdAtMs: number;
  readonly expiresAtMs: number;
  readonly consumedAtMs: number | null;
  readonly revokedAtMs: number | null;
  // Approval card fields (Task 8)
  readonly preview?: unknown;
  readonly cardHash?: string;
  readonly permissions?: readonly string[];
  readonly consequence?: string;
  readonly ruleId?: string;
}

/** One verify call. `nowMs` is injectable so tests need no clock mocks. */
export interface GrantVerifyAttempt {
  readonly userId: string;
  readonly service: string;
  readonly target: string;
  readonly payload: unknown;
  readonly policyVersion: string | number;
  readonly nowMs?: number;
}

export type GrantDenyReason =
  | "unknown_nonce"
  | "invalid_user"
  | "payload_hash_mismatch"
  | "user_mismatch"
  | "service_mismatch"
  | "target_mismatch"
  | "expired"
  | "revoked"
  | "policy_version_mismatch"
  | "free_text_not_allowed";

export type GrantVerdict = { readonly ok: true } | { readonly ok: false; readonly reason: GrantDenyReason };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Free-text strings that are not valid approval payloads. */
const FREE_TEXT_PATTERNS = [
  /^yes$/i,
  /^approve$/i,
  /^ok$/i,
  /^okay$/i,
  /^confirm$/i,
  /^agree$/i,
  /^allow$/i,
  /^sure$/i,
  /^y$/i,
  /^yep$/i,
  /^yeah$/i,
];

/** Check if a payload is free-form text that should not be treated as approval. */
function isFreeText(payload: unknown): boolean {
  if (typeof payload !== "string") {
    return false;
  }
  return FREE_TEXT_PATTERNS.some((pattern) => pattern.test(payload.trim()));
}

/** Check that a value is a UUID string, matching the user_id column type. */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

/** Hash one object payload the way the record stored it. */
export function hashObjectPayload(payload: unknown): string {
  return computeApprovalHash(payload);
}

/** Validate that the verification attempt payload is not free-form text. */
export function validateVerifyPayload(payload: unknown): void {
  if (isFreeText(payload)) {
    throw new Error("free_text_not_allowed");
  }
  if (typeof payload === "string") {
    throw new Error("free_text_not_allowed");
  }
  if (payload === null || payload === undefined) {
    throw new Error("free_text_not_allowed");
  }
  if (Array.isArray(payload)) {
    throw new Error("free_text_not_allowed");
  }
  if (typeof payload !== "object") {
    throw new Error("free_text_not_allowed");
  }
}

/** Compare a stored grant against a verification attempt. First failing
 *  check wins; hash binding is checked before identity so replay evidence
 *  names the payload first. */
export function verifyBinding(record: GrantRecord, attempt: GrantVerifyAttempt): GrantVerdict {
  // Reject free-form text payloads at the policy boundary (Task 11).
  try {
    validateVerifyPayload(attempt.payload);
  } catch {
    return { ok: false, reason: "free_text_not_allowed" };
  }
  if (!isUuid(attempt.userId)) {
    return { ok: false, reason: "invalid_user" };
  }
  if (hashObjectPayload(attempt.payload) !== record.payloadHash) {
    return { ok: false, reason: "payload_hash_mismatch" };
  }
  if (attempt.userId !== record.userId) {
    return { ok: false, reason: "user_mismatch" };
  }
  if (attempt.service !== record.service) {
    return { ok: false, reason: "service_mismatch" };
  }
  if (attempt.target !== record.target) {
    return { ok: false, reason: "target_mismatch" };
  }
  // WHY: revoked is an explicit admin action with audit semantics;
  // it takes precedence over natural expiry. Check revoked first.
  if (record.revokedAtMs !== null) {
    return { ok: false, reason: "revoked" };
  }
  const nowMs = attempt.nowMs ?? Date.now();
  if (nowMs >= record.expiresAtMs) {
    return { ok: false, reason: "expired" };
  }
  // WHY: HTTP callers may send a number version; the column and record are text.
  if (String(attempt.policyVersion) !== record.policyVersion) {
    return { ok: false, reason: "policy_version_mismatch" };
  }
  return { ok: true };
}