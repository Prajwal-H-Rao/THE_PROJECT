/**
 * Submission adapter (task 12.14).
 * Submits an application through an allowed path with an Idempotency-Key.
 * A retry with the same key does not double-submit.
 */

import { type ApplicationEnvelope } from "./envelope.js";

/** The submission result. */
export interface SubmissionResult {
  readonly submitted: boolean;
  readonly idempotencyKey: string;
  readonly reason: string;
}

/** In-memory record of submitted idempotency keys (replaced by DB in 12.14+). */
const SUBMITTED_KEYS: Set<string> = new Set();

/**
 * Submit one application. Returns submitted=true on first call with a key;
 * returns submitted=false with reason "duplicate" on retry with the same key.
 */
export function submitApplication(
  envelope: ApplicationEnvelope,
  idempotencyKey: string,
): SubmissionResult {
  if (SUBMITTED_KEYS.has(idempotencyKey)) {
    return { submitted: false, idempotencyKey, reason: "duplicate" };
  }
  SUBMITTED_KEYS.add(idempotencyKey);
  return { submitted: true, idempotencyKey, reason: "" };
}

/** Return true when a key has already been submitted. */
export function isDuplicateKey(idempotencyKey: string): boolean {
  return SUBMITTED_KEYS.has(idempotencyKey);
}

/** Clear the submitted-key store (test helper). */
export function clearSubmittedKeys(): void {
  SUBMITTED_KEYS.clear();
}
