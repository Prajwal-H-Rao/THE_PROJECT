/** Grant creation handlers. Implements the Task 4 and Task 8 grant
 *  creation logic with payload hash binding and optional card preview. */

import { randomBytes, randomUUID } from "node:crypto";
import type { GrantRecord } from "./grant-binding.js";
import { hashObjectPayload, isUuid } from "./grant-binding.js";
import { computeApprovalHash } from "@nova/contracts/approval-hash";
import type { GrantRepository } from "./grant-repository-types.js";
import { GrantValidationError } from "./grants.service.js";
import { MAX_PREVIEW_BYTES, validateAndHashPreview, deriveConsequence, derivePermissions } from "./grant-card.js";

const NONCE_BYTES = 16;
const DEFAULT_POLICY_VERSION = "1";

/** Input for basic grant creation (Task 4). */
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

/** Create one grant bound to payload hash, user, target, expiry and nonce. */
export function createGrant(
  repository: GrantRepository,
  input: CreateGrantInput
): GrantRecord {
  if (!isUuid(input.userId)) {
    throw new GrantValidationError("invalid_user", "userId must be a UUID");
  }
  const payloadHash = (() => {
    try {
      return hashObjectPayload(input.payload);
    } catch {
      throw new GrantValidationError("invalid_payload", "payload must be JSON-representable");
    }
  })();
  if (!Number.isFinite(input.ttlSeconds) || input.ttlSeconds <= 0) {
    throw new GrantValidationError("invalid_ttl", "ttlSeconds must be a positive finite number");
  }
  if (typeof input.service !== "string" || input.service === "" || typeof input.action !== "string" || input.action === "" || typeof input.target !== "string" || input.target === "") {
    throw new GrantValidationError("invalid_fields", "service, action and target must be non-empty strings");
  }
  const nowMs = input.nowMs ?? Date.now();
  const record: GrantRecord = {
    grantId: randomUUID(),
    userId: input.userId,
    service: input.service,
    action: input.action,
    target: input.target,
    payloadHash,
    policyVersion: String(input.policyVersion ?? DEFAULT_POLICY_VERSION),
    nonce: randomBytes(NONCE_BYTES).toString("hex"),
    createdAtMs: nowMs,
    expiresAtMs: nowMs + input.ttlSeconds * 1000,
    consumedAtMs: null,
    revokedAtMs: null,
  };
  repository.save(record);
  return record;
}

/** Create a grant with approval card details (Task 8). */
export function createGrantWithDetails(
  repository: GrantRepository,
  input: CreateGrantWithDetailsInput
): GrantRecord {
  // Validate base input
  if (!isUuid(input.userId)) {
    throw new GrantValidationError("invalid_user", "userId must be a UUID");
  }
  const payloadHash = (() => {
    try {
      return hashObjectPayload(input.payload);
    } catch {
      throw new GrantValidationError("invalid_payload", "payload must be JSON-representable");
    }
  })();
  if (!Number.isFinite(input.ttlSeconds) || input.ttlSeconds <= 0) {
    throw new GrantValidationError("invalid_ttl", "ttlSeconds must be a positive finite number");
  }
  if (typeof input.service !== "string" || input.service === "" || typeof input.action !== "string" || input.action === "" || typeof input.target !== "string" || input.target === "") {
    throw new GrantValidationError("invalid_fields", "service, action and target must be non-empty strings");
  }

  // WHY: preview is the exact object shown to user. Enforce size limit.
  let preview: unknown | undefined;
  let cardHash: string | undefined;
  if (input.preview !== undefined) {
    try {
      const { preview: validatedPreview, cardHash: validatedCardHash } = validateAndHashPreview(input.preview);
      preview = validatedPreview;
      cardHash = validatedCardHash;
    } catch (error) {
      if (error instanceof Error) {
        throw new GrantValidationError("preview_too_large", error.message);
      }
      throw error;
    }
  }

  const nowMs = input.nowMs ?? Date.now();
  const record: GrantRecord = {
    grantId: randomUUID(),
    userId: input.userId,
    service: input.service,
    action: input.action,
    target: input.target,
    payloadHash,
    policyVersion: String(input.policyVersion ?? DEFAULT_POLICY_VERSION),
    nonce: randomBytes(NONCE_BYTES).toString("hex"),
    createdAtMs: nowMs,
    expiresAtMs: nowMs + input.ttlSeconds * 1000,
    consumedAtMs: null,
    revokedAtMs: null,
    preview,
    cardHash,
    permissions: input.permissions,
    consequence: input.consequence,
    ruleId: input.ruleId,
  };
  repository.save(record);
  return record;
}