/** Grant outcome handlers: approve, reject, expire, edit. Implements the
 *  Task 9 lifecycle transitions that domain services invoke. */

import type { GrantRecord } from "./grant-binding.js";
import { hashObjectPayload, isUuid } from "./grant-binding.js";
import type { GrantRepository, StatusVerdict, EditVerdict, EditGrantInput } from "./grant-repository-types.js";
import { GrantValidationError } from "./grants.service.js";
import { deriveConsequence, derivePermissions, validateAndHashPreview } from "./grant-card.js";

/** Type guard to check if editGrant result is a success with GrantRecord. */
function isEditSuccess(result: GrantRecord | { ok: false; reason: "unknown_nonce" | "already_terminal" }): result is GrantRecord {
  return !("ok" in result);
}

/** Handle grant approval. */
export async function handleApproveGrant(
  repository: GrantRepository,
  nonce: string,
  decidedBy: string
): Promise<StatusVerdict> {
  if (!/^[0-9a-f]{32}$/i.test(nonce)) {
    throw new GrantValidationError("invalid_nonce", "nonce must be a 32-char hex string");
  }
  if (!isUuid(decidedBy)) {
    throw new GrantValidationError("invalid_user", "decidedBy must be a UUID");
  }
  return repository.updateStatus(nonce, "approved", decidedBy, Date.now());
}

/** Handle grant rejection: revokes and marks denied. */
export async function handleRejectGrant(
  repository: GrantRepository,
  nonce: string,
  decidedBy: string
): Promise<StatusVerdict> {
  if (!/^[0-9a-f]{32}$/i.test(nonce)) {
    throw new GrantValidationError("invalid_nonce", "nonce must be a 32-char hex string");
  }
  if (!isUuid(decidedBy)) {
    throw new GrantValidationError("invalid_user", "decidedBy must be a UUID");
  }
  await repository.tryRevoke(nonce, Date.now());
  return repository.updateStatus(nonce, "denied", decidedBy, Date.now());
}

/** Handle grant expiry: revokes and marks expired. */
export async function handleExpireGrant(
  repository: GrantRepository,
  nonce: string,
  decidedBy: string
): Promise<StatusVerdict> {
  if (!/^[0-9a-f]{32}$/i.test(nonce)) {
    throw new GrantValidationError("invalid_nonce", "nonce must be a 32-char hex string");
  }
  if (!isUuid(decidedBy)) {
    throw new GrantValidationError("invalid_user", "decidedBy must be a UUID");
  }
  await repository.tryRevoke(nonce, Date.now());
  return repository.updateStatus(nonce, "expired", decidedBy, Date.now());
}

/** Handle grant edit: re-hashes payload and card, then re-routes to policy.
 *  WHY: edit re-hashes and re-routes to policy per Task 9 acceptance. */
export async function handleEditGrant(
  repository: GrantRepository,
  nonce: string,
  input: EditGrantInput,
  policyDecision: { decision: "allow" | "deny" | "needs_approval"; ruleId: string; policyVersion: string | number; requiresStepUp?: boolean }
): Promise<EditVerdict> {
  if (!/^[0-9a-f]{32}$/i.test(nonce)) {
    throw new GrantValidationError("invalid_nonce", "nonce must be a 32-char hex string");
  }
  if (!isUuid(input.userId)) {
    throw new GrantValidationError("invalid_user", "userId must be a UUID");
  }
  if (!Number.isFinite(input.ttlSeconds) || input.ttlSeconds <= 0) {
    throw new GrantValidationError("invalid_ttl", "ttlSeconds must be a positive finite number");
  }

  // Compute new payload hash
  const newPayloadHash = (() => {
    try {
      return hashObjectPayload(input.payload);
    } catch {
      throw new GrantValidationError("invalid_payload", "payload must be JSON-representable");
    }
  })();

  // Compute card details from new payload
  let preview: unknown | undefined;
  let cardHash: string | undefined;
  try {
    const result = validateAndHashPreview(input.payload);
    preview = result.preview;
    cardHash = result.cardHash;
  } catch (error) {
    if (error instanceof Error) {
      throw new GrantValidationError("preview_too_large", error.message);
    }
    throw error;
  }
  const permissions = derivePermissions(input.allowedActions, "edit");
  const consequence = input.riskTier && input.sensitivity
    ? deriveConsequence(input.riskTier, input.sensitivity)
    : undefined;
  const newExpiresAtMs = (input.nowMs ?? Date.now()) + input.ttlSeconds * 1000;

  // Re-route to policy: the policy decision determines the outcome
  if (policyDecision.decision === "deny") {
    return { ok: false, reason: "policy_denied" };
  }
  if (policyDecision.decision === "needs_approval") {
    // Edit accepted but returns to pending — fresh approval required
    const result = await repository.editGrant(
      nonce,
      input.payload,
      newPayloadHash,
      cardHash,
      preview,
      permissions,
      consequence,
      input.ruleId ?? policyDecision.ruleId,
      newExpiresAtMs,
      Date.now()
    );
    if (!isEditSuccess(result)) {
      return result;
    }
    return { ok: true, record: result };
  }
  // allow: edit accepted and approved
  const result = await repository.editGrant(
    nonce,
    input.payload,
    newPayloadHash,
    cardHash,
    preview,
    permissions,
    consequence,
    input.ruleId ?? policyDecision.ruleId,
    newExpiresAtMs,
    Date.now()
  );
  if (!isEditSuccess(result)) {
    return result;
  }
  // Also mark as approved
  await repository.updateStatus(nonce, "approved", input.userId, Date.now());
  return { ok: true, record: result };
}