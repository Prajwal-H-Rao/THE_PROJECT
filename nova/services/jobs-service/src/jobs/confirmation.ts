/**
 * Confirmation record (task 12.15).
 * Records provider reference, timestamp and response evidence after submission.
 * No evidence means status_unknown.
 */

import { type ApplicationEnvelope } from "./envelope.js";

/** The confirmation record. */
export interface ConfirmationRecord {
  readonly submissionId: string;
  readonly providerReference: string | null;
  readonly responseEvidence: string | null;
  readonly confirmedAt: string;
  readonly status: "submitted" | "acknowledged" | "rejected" | "withdrawn" | "status_unknown";
}

/** Build a confirmation record from provider evidence. */
export function buildConfirmation(
  submissionId: string,
  envelope: ApplicationEnvelope,
  providerReference: string | null,
  responseEvidence: string | null,
): ConfirmationRecord {
  const status = providerReference !== null && responseEvidence !== null
    ? "acknowledged"
    : "status_unknown";
  return {
    submissionId,
    providerReference,
    responseEvidence,
    confirmedAt: new Date().toISOString(),
    status,
  };
}

/** Return true when the confirmation has authoritative evidence. */
export function hasEvidence(record: ConfirmationRecord): boolean {
  return record.providerReference !== null && record.responseEvidence !== null;
}

/** Return true when the outcome is status_unknown (no evidence). */
export function isStatusUnknown(record: ConfirmationRecord): boolean {
  return record.status === "status_unknown";
}
