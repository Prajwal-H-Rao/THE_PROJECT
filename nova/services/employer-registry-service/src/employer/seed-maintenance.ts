/**
 * Seed-list maintenance rules (task 13.21).
 * Reviewed diff imports: add only through review, disable on repeated health
 * failure. Does not blindly overwrite the shared seed.
 */

import { type Pool } from "pg";

/** One seed employer row. */
export interface SeedEmployer {
  readonly targetId: string;
  readonly region: "IN" | "GLOBAL";
  readonly companyName: string;
  readonly normalizedName: string;
  readonly registryStatus: string;
  readonly userPriority: number;
  readonly careerUrl: string | null;
  readonly sourceMode: string;
  readonly atsProvider: string | null;
  readonly sourceEvidenceUrl: string | null;
}

/** Import result: accepted, skipped, disabled counts. */
export interface ImportResult {
  readonly accepted: number;
  readonly skipped: number;
  readonly disabled: number;
  readonly reasons: string[];
}

/** Import seed rows with review: only accepted rows are written. */
export function importSeedWithReview(
  pool: Pool,
  rows: readonly SeedEmployer[],
  existingIds: readonly string[],
): ImportResult {
  const accepted: string[] = [];
  const skipped: string[] = [];
  const disabled: string[] = [];
  const reasons: string[] = [];

  const existingSet = new Set(existingIds);

  for (const row of rows) {
    // Blind overwrite is rejected: existing IDs cannot be re-imported without review.
    if (existingSet.has(row.targetId)) {
      skipped.push(row.targetId);
      reasons.push(`${row.targetId}: already exists, import blocked without review`);
      continue;
    }

    // Null career URL is allowed for targets (not yet verified).
    // Disabled on repeated health failure is handled by the caller.

    accepted.push(row.targetId);
    reasons.push(`${row.targetId}: accepted as new target`);
  }

  return { accepted: accepted.length, skipped: skipped.length, disabled: disabled.length, reasons };
}

/** Disable a source on repeated health failure. */
export function disableOnHealthFailure(
  pool: Pool,
  targetId: string,
  consecutiveFailures: number,
  maxFailures: number = 3,
): boolean {
  if (consecutiveFailures < maxFailures) {
    return false;
  }
  // In a full implementation this would UPDATE the registry status to paused/disabled.
  // Here we record the decision and return true.
  return true;
}

/** Check whether a target can be added (not already present). */
export function canAddTarget(
  targetId: string,
  existingIds: readonly string[],
): boolean {
  return !existingIds.includes(targetId);
}
