/**
 * Duplicate detection (task 12.18).
 * Detects duplicate applications across the user's own applications and job
 * cards. A second application to one job is rejected.
 */

import { type ApplicationEnvelope } from "./envelope.js";

/** One existing application record. */
export interface ExistingApplication {
  readonly userId: string;
  readonly listingId: string;
  readonly jobId: string;
}

/** The duplicate check result. */
export interface DuplicateResult {
  readonly duplicate: boolean;
  readonly existing?: ExistingApplication;
  readonly reason: string;
}

/**
 * Check whether applying to one job would duplicate an existing application
 * for the same user. Returns duplicate=true when a match exists.
 */
export function checkDuplicate(
  userId: string,
  listingId: string,
  jobId: string,
  existing: readonly ExistingApplication[],
): DuplicateResult {
  const match = existing.find(
    (a) => a.userId === userId && (a.listingId === listingId || a.jobId === jobId),
  );
  if (match !== undefined) {
    return {
      duplicate: true,
      existing: match,
      reason: `second application to one job is rejected: ${match.jobId}`,
    };
  }
  return { duplicate: false, reason: "" };
}
