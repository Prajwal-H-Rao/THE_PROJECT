/** The grant repository interface and verdict types. Shared between
 *  grant-repository.ts and grants.service.ts. */

import type { GrantRecord } from "./grant-binding.js";

/** The storage contract. Keyed by nonce: the unique grant key. */
export interface GrantRepository {
  save(record: GrantRecord): void;
  findByNonce(nonce: string): GrantRecord | null;
  /** Atomically consume a grant. Returns consume verdict. */
  tryConsume(nonce: string, nowMs: number): Promise<ConsumeVerdict>;
  /** Atomically revoke a grant. Returns revoke verdict. */
  tryRevoke(nonce: string, nowMs: number): Promise<RevokeVerdict>;
  /** Update grant status (Task 9). */
  updateStatus(
    nonce: string,
    status: "approved" | "denied" | "expired" | "revoked",
    decidedBy: string,
    nowMs: number
  ): Promise<{ ok: true; decidedAtMs: number } | { ok: false; reason: "unknown_nonce" }>;
  /** Edit a grant with new payload and policy decision fields (Task 9). */
  editGrant(
    nonce: string,
    newPayload: unknown,
    newPayloadHash: string,
    newCardHash: string | undefined,
    newPreview: unknown | undefined,
    newPermissions: readonly string[] | undefined,
    newConsequence: string | undefined,
    newRuleId: string | undefined,
    newExpiresAtMs: number,
    nowMs: number
  ): Promise<GrantRecord | { ok: false; reason: "unknown_nonce" | "already_terminal" }>;
}

/** Result of a consume attempt. */
export type ConsumeVerdict =
  | { readonly ok: true; readonly consumedAtMs: number }
  | { readonly ok: false; readonly reason: "already_used" | "unknown_nonce" | "already_revoked" };

/** Result of a revoke attempt. */
export type RevokeVerdict =
  | { readonly ok: true; readonly revokedAtMs: number }
  | { readonly ok: false; readonly reason: "unknown_nonce" | "already_used" };

/** Result of a status update (approve/reject/expire). */
export type StatusVerdict =
  | { readonly ok: true; readonly decidedAtMs: number }
  | { readonly ok: false; readonly reason: "unknown_nonce" };

/** Input for editing a grant (Task 9). */
export interface EditGrantInput {
  readonly userId: string;
  readonly payload: unknown;
  readonly ttlSeconds: number;
  readonly ruleId?: string;
  readonly allowedActions?: readonly string[];
  readonly riskTier?: string;
  readonly sensitivity?: string;
  readonly nowMs?: number;
}

/** Result of an edit attempt. */
export type EditVerdict =
  | { readonly ok: true; readonly record: GrantRecord }
  | { readonly ok: false; readonly reason: "unknown_nonce" | "already_terminal" | "policy_denied" | "policy_needs_approval" };