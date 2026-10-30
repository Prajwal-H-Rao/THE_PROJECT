/** Grant Verification types — shared types for the verification client. */

import { computeApprovalHash, canonicalPayload } from "./approval-hash.js";

/** Configuration for the grant verification client. */
export interface GrantVerificationConfig {
  /** Base URL of the policy-approval-service (e.g., "http://policy-approval-service:3000"). */
  baseUrl: string;
  /** Service name making the request (used for service validation on card endpoint). */
  serviceName: string;
  /** Optional fetch implementation (defaults to global fetch). */
  fetch?: typeof fetch;
}

/** Result of verifying a grant. */
export interface GrantVerifyResult {
  ok: boolean;
  reason?: "payload_hash_mismatch" | "user_mismatch" | "service_mismatch"
    | "target_mismatch" | "expired" | "revoked" | "policy_version_mismatch"
    | "invalid_user" | "unknown_nonce" | "action_mismatch";
}

/** Result of consuming a grant. */
export interface GrantConsumeResult {
  ok: boolean;
  consumedAtMs?: number;
  reason?: "already_used" | "unknown_nonce" | "already_revoked" | "invalid_nonce";
}

/** Grant card data for display. */
export interface GrantCard {
  target: string;
  preview: unknown;
  permissions: readonly string[];
  consequence: string;
  expiresAtMs: number;
  cardHash: string;
}

/** Options for verifying a grant. */
export interface VerifyGrantOptions {
  /** The user ID the grant was issued to. */
  userId: string;
  /** The target of the action (e.g., "message:draft-1"). */
  target: string;
  /** The exact payload that was approved (must match the preview used to create the grant). */
  payload: unknown;
  /** The policy version at the time of grant creation. */
  policyVersion: string | number;
  /** The full catalogue operation_id (e.g., "inbox.send"). Must match the grant's action. */
  action: string;
}

/** Options for consuming a grant. */
export interface ConsumeGrantOptions {
  /** The grant nonce (32-char hex from the grant creation response). */
  nonce: string;
}

/** Options for fetching a grant card. */
export interface GetGrantCardOptions {
  /** The grant nonce (32-char hex from the grant creation response). */
  nonce: string;
}

/** Error thrown by the grant verification client. */
export class GrantVerificationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "GrantVerificationError";
  }
}

export { computeApprovalHash, canonicalPayload };