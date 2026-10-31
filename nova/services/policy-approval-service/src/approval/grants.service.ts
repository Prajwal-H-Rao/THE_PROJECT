/** The grants service. Creates grant records, verifies verification
 *  attempts against the binding, and delegates grant lifecycle (approve,
 *  reject, expire, edit) to outcome handlers. Storage is an in-memory
 *  repository because Postgres is unavailable here; the SQL swap later
 *  keeps this interface. */

import { Injectable } from "@nestjs/common";
import type { GrantRecord, GrantVerdict, GrantVerifyAttempt } from "./grant-binding.js";
import { hashObjectPayload, isUuid, verifyBinding } from "./grant-binding.js";
import type { GrantRepository, ConsumeVerdict, RevokeVerdict, StatusVerdict, EditVerdict } from "./grant-repository-types.js";
import { InMemoryGrantRepository } from "./grant-repository.js";
import { MAX_PREVIEW_BYTES, formatGrantCard } from "./grant-card.js";
import {
  handleApproveGrant,
  handleRejectGrant,
  handleExpireGrant,
  handleEditGrant
} from "./grant-outcomes.js";
import { createGrant, createGrantWithDetails } from "./grant-creation.js";
import { approvalMetrics } from "./approval-metrics.js";

/** The input for grant creation. */
export interface CreateGrantInput {
  readonly userId: string;
  readonly service: string;
  readonly action: string;
  readonly target: string;
  readonly payload: unknown;
  readonly ttlSeconds: number;
  readonly policyVersion?: string | number;
  readonly nowMs?: number;
}

/** Extended input for grant creation with approval card details (Task 8). */
export interface CreateGrantWithDetailsInput extends CreateGrantInput {
  readonly preview?: unknown;
  readonly permissions?: readonly string[];
  readonly consequence?: string;
  readonly ruleId?: string;
}

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

/** Error for rejected creation input. The controller maps it to HTTP 400. */
export class GrantValidationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

// WHY: the grants nonce is the unique grant key. randomBytes, never derived
// from a timestamp, so two grants cannot collide and cannot be guessed.
const NONCE_BYTES = 16;
const DEFAULT_POLICY_VERSION = "1";

@Injectable()
export class GrantsService {
  constructor(private readonly repository: GrantRepository) {}

  /** Create one grant bound to payload hash, user, target, expiry and nonce. */
  async createGrant(input: CreateGrantInput): Promise<GrantRecord> {
    const record = await createGrant(this.repository, input);
    approvalMetrics.recordCreated(record);
    return record;
  }

  /** Create a grant with approval card details (Task 8). */
  async createGrantWithDetails(input: CreateGrantWithDetailsInput): Promise<GrantRecord> {
    const record = await createGrantWithDetails(this.repository, input);
    approvalMetrics.recordCreated(record);
    return record;
  }

  /** Verify one attempt against the stored grant. */
  verifyGrant(nonce: string, attempt: GrantVerifyAttempt): GrantVerdict {
    const record = this.repository.findByNonce(nonce);
    if (record === null) {
      return { ok: false, reason: "unknown_nonce" };
    }
    return verifyBinding(record, attempt);
  }

  /** Consume a grant once. Validates nonce format then delegates to repo. */
  async consumeGrant(nonce: string): Promise<ConsumeVerdict> {
    if (!/^[0-9a-f]{32}$/i.test(nonce)) {
      throw new GrantValidationError("invalid_nonce", "nonce must be a 32-char hex string");
    }
    const record = this.repository.findByNonce(nonce);
    const verdict = await this.repository.tryConsume(nonce, Date.now());
    if (verdict.ok && record) {
      approvalMetrics.recordConsumed(record, verdict.consumedAtMs!);
    }
    return verdict;
  }

  /** Revoke a grant. Validates nonce format then delegates to repo. */
  async revokeGrant(nonce: string): Promise<RevokeVerdict> {
    if (!/^[0-9a-f]{32}$/i.test(nonce)) {
      throw new GrantValidationError("invalid_nonce", "nonce must be a 32-char hex string");
    }
    const record = this.repository.findByNonce(nonce);
    const verdict = await this.repository.tryRevoke(nonce, Date.now());
    if (verdict.ok && record) {
      approvalMetrics.recordRevoked(record, verdict.revokedAtMs!);
    }
    return verdict;
  }

  /** Get grant card for display (Task 8). Validates service matches. */
  async getGrantCard(nonce: string, service: string): Promise<{
    target: string;
    preview: unknown;
    permissions: readonly string[];
    consequence: string;
    expiresAtMs: number;
    cardHash: string;
  } | null> {
    if (!/^[0-9a-f]{32}$/i.test(nonce)) {
      throw new GrantValidationError("invalid_nonce", "nonce must be a 32-char hex string");
    }
    const record = this.repository.findByNonce(nonce);
    if (record === null) {
      return null;
    }
    return formatGrantCard(record, service);
  }

  /** Approve a grant. Sets status to approved. */
  async approveGrant(nonce: string, decidedBy: string): Promise<StatusVerdict> {
    const record = this.repository.findByNonce(nonce);
    if (!record) {
      return { ok: false, reason: "unknown_nonce" };
    }
    // Layer 9: Prevent self-extension — block self-approval of grants
    if (record.userId === decidedBy) {
      return { ok: false, reason: "self_extension_prohibited" };
    }
    const verdict = await handleApproveGrant(this.repository, nonce, decidedBy);
    if (verdict.ok && record) {
      approvalMetrics.recordApproved(record, verdict.decidedAtMs!);
    }
    return verdict;
  }

  /** Reject a grant. Sets status to denied and revokes the grant. */
  async rejectGrant(nonce: string, decidedBy: string): Promise<StatusVerdict> {
    const record = this.repository.findByNonce(nonce);
    if (!record) {
      return { ok: false, reason: "unknown_nonce" };
    }
    // Layer 9: Prevent self-extension — block self-rejection of grants
    if (record.userId === decidedBy) {
      return { ok: false, reason: "self_extension_prohibited" };
    }
    const verdict = await handleRejectGrant(this.repository, nonce, decidedBy);
    if (verdict.ok && record) {
      approvalMetrics.recordRejected(record, verdict.decidedAtMs!);
    }
    return verdict;
  }

  /** Expire a grant. Sets status to expired and revokes the grant. */
  async expireGrant(nonce: string, decidedBy: string): Promise<StatusVerdict> {
    const record = this.repository.findByNonce(nonce);
    if (!record) {
      return { ok: false, reason: "unknown_nonce" };
    }
    // Layer 9: Prevent self-extension — block self-expiration of grants
    if (record.userId === decidedBy) {
      return { ok: false, reason: "self_extension_prohibited" };
    }
    const verdict = await handleExpireGrant(this.repository, nonce, decidedBy);
    if (verdict.ok && record) {
      approvalMetrics.recordExpired(record, verdict.decidedAtMs!);
    }
    return verdict;
  }

  /** Edit a grant. Re-hashes the payload and card, then re-routes to policy.
   *  Returns the edited record on allow, or error on deny/needs_approval.
   *  WHY: edit re-hashes and re-routes to policy per Task 9 acceptance. */
  async editGrant(
    nonce: string,
    input: EditGrantInput,
    policyDecision: { decision: "allow" | "deny" | "needs_approval"; ruleId: string; policyVersion: string | number; requiresStepUp?: boolean }
  ): Promise<EditVerdict> {
    const record = this.repository.findByNonce(nonce);
    if (!record) {
      return { ok: false, reason: "unknown_nonce" };
    }
    // Layer 9: Prevent self-extension — block self-editing of grants
    if (record.userId === input.userId) {
      return { ok: false, reason: "self_extension_prohibited" };
    }
    return handleEditGrant(this.repository, nonce, input, policyDecision);
  }
}