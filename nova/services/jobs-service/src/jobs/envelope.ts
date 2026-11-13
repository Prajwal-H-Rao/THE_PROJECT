/**
 * Application envelope (task 12.12, spec:528).
 * Builds an approval-bound envelope: payload hash, job ID, user ID, expiry,
 * nonce and tool version. Any byte change to the payload invalidates the
 * envelope hash.
 */

import { computeApprovalHash, canonicalPayload } from "@nova/contracts/approval-hash";

/** The application envelope. Bound to the exact payload. */
export interface ApplicationEnvelope {
  readonly jobId: string;
  readonly userId: string;
  readonly payloadHash: string;
  readonly expiry: string;
  readonly nonce: string;
  readonly toolVersion: string;
}

/** Build one envelope. The hash is SHA-256 over the canonical payload bytes. */
export function buildEnvelope(
  jobId: string,
  userId: string,
  payload: unknown,
  expiry: string,
  toolVersion: string,
): ApplicationEnvelope {
  return {
    jobId,
    userId,
    payloadHash: computeApprovalHash(payload),
    expiry,
    nonce: crypto.randomUUID(),
    toolVersion,
  };
}

/** Return true when one byte of payload change invalidates the stored hash. */
export function envelopeMatches(
  envelope: ApplicationEnvelope,
  payload: unknown,
): boolean {
  return computeApprovalHash(payload) === envelope.payloadHash;
}

/** Return true when the envelope has not expired (ISO timestamp comparison). */
export function isEnvelopeValid(envelope: ApplicationEnvelope): boolean {
  return new Date(envelope.expiry) > new Date();
}

/** Return the canonical payload form for display/audit. */
export function envelopeCanonicalPayload(payload: unknown): string {
  return canonicalPayload(payload);
}
