/**
 * Submission gate (task 12.13, spec:528).
 * Gates application submission behind an approval grant bound to the exact
 * envelope. An altered envelope fails at the domain service before any
 * submission path is reached.
 */

import { GrantVerificationClient } from "@nova/contracts/grant-verification";
import { computeApprovalHash } from "@nova/contracts/approval-hash";
import { type ApplicationEnvelope } from "./envelope.js";

/** The gate result. */
export interface GateResult {
  readonly allowed: boolean;
  readonly reason: string;
}

/** Verify that a grant is valid for submitting this envelope. */
export async function gateSubmission(
  client: GrantVerificationClient,
  nonce: string,
  envelope: ApplicationEnvelope,
  userId: string,
  jobId: string,
): Promise<GateResult> {
  const payload = {
    jobId,
    userId,
    payloadHash: envelope.payloadHash,
    expiry: envelope.expiry,
    toolVersion: envelope.toolVersion,
  };

  try {
    const result = await client.verifyGrant(nonce, {
      userId,
      target: `jobs:${jobId}`,
      payload,
      policyVersion: "1",
      action: "jobs.apply",
    });

    if (!result.ok) {
      return { allowed: false, reason: `grant denied: ${result.reason ?? "unknown"}` };
    }
    return { allowed: true, reason: "" };
  } catch (error) {
    if (error instanceof Error) {
      return { allowed: false, reason: `grant request failed: ${error.message}` };
    }
    return { allowed: false, reason: "grant request failed: unknown error" };
  }
}

/** Verify that the payload matches the envelope hash before submission. */
export function envelopeUnchanged(envelope: ApplicationEnvelope, payload: unknown): boolean {
  return computeApprovalHash(payload) === envelope.payloadHash;
}
