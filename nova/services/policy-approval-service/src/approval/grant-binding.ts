/** The approval grant binding. Pure functions that compare a grant record
 * against a verification attempt. Any material difference denies the grant.
 * See docs/design-notes/nova-approval-grants.md for the binding semantics. */

import { computeApprovalHash } from "@nova/contracts/approval-hash";

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
  | "policy_version_mismatch";

export type GrantVerdict = { readonly ok: true } | { readonly ok: false; readonly reason: GrantDenyReason };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Check that a value is a UUID string, matching the user_id column type. */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

/** Hash one object payload the way the record stored it. */
export function hashObjectPayload(payload: unknown): string {
  return computeApprovalHash(payload);
}

/** Compare a stored grant against a verification attempt. First failing
 * check wins; hash binding is checked before identity so replay evidence
 * names the payload first. */
export function verifyBinding(record: GrantRecord, attempt: GrantVerifyAttempt): GrantVerdict {
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
