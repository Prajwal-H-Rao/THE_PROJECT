/**
 * Freshness, changed-field, stale and closed thresholds (task 13.19).
 * Evaluates listing freshness against configured thresholds.
 * Builds on the FreshnessState / ListingStatus unions from @nova/contracts.
 */

import { type FreshnessState, type ListingStatus } from "@nova/contracts/job-listing";

/** Thresholds for freshness evaluation. */
export interface FreshnessThresholds {
  /** Max age in hours before a "current" listing becomes "stale". */
  staleAfterHours: number;
  /** Max age in hours before a listing is considered "closed". */
  closedAfterHours: number;
}

/** Default thresholds: stale after 7 days, closed after 30 days. */
export const DEFAULT_THRESHOLDS: FreshnessThresholds = {
  staleAfterHours: 168, // 7 days
  closedAfterHours: 720, // 30 days
};

/** Evaluation result for one listing. */
export interface FreshnessResult {
  readonly listingId: string;
  readonly freshnessState: FreshnessState;
  readonly listingStatus: ListingStatus;
  readonly hoursSinceRetrieved: number;
  readonly reasons: string[];
}

/** Hours between two ISO timestamps. */
function hoursBetween(earlier: string, later: string): number {
  return (Date.parse(later) - Date.parse(earlier)) / (1000 * 60 * 60);
}

/**
 * Evaluate freshness for one listing against thresholds.
 * A listing is "stale" when its retrieved_at is older than staleAfterHours.
 * It is "closed" when older than closedAfterHours.
 */
export function evaluateFreshness(
  listingId: string,
  retrievedAt: string,
  now: string,
  thresholds: FreshnessThresholds = DEFAULT_THRESHOLDS,
): FreshnessResult {
  const hours = hoursBetween(retrievedAt, now);
  const reasons: string[] = [];

  let freshnessState: FreshnessState = "current";
  let listingStatus: ListingStatus = "open";

  if (hours > thresholds.closedAfterHours) {
    freshnessState = "stale";
    listingStatus = "closed";
    reasons.push(`no retrieval for ${hours.toFixed(1)}h, exceeding closed threshold ${thresholds.closedAfterHours}h`);
  } else if (hours > thresholds.staleAfterHours) {
    freshnessState = "stale";
    reasons.push(`no retrieval for ${hours.toFixed(1)}h, exceeding stale threshold ${thresholds.staleAfterHours}h`);
  }

  return {
    listingId,
    freshnessState,
    listingStatus,
    hoursSinceRetrieved: hours,
    reasons,
  };
}

/** Evaluate freshness for many listings. Returns results and stale count. */
export function evaluateBatch(
  listings: Array<{ listingId: string; retrievedAt: string }>,
  now: string,
  thresholds: FreshnessThresholds = DEFAULT_THRESHOLDS,
): { results: FreshnessResult[]; staleCount: number; closedCount: number } {
  const results = listings.map((l) => evaluateFreshness(l.listingId, l.retrievedAt, now, thresholds));
  const staleCount = results.filter((r) => r.freshnessState === "stale").length;
  const closedCount = results.filter((r) => r.listingStatus === "closed").length;
  return { results, staleCount, closedCount };
}

/** Changed-field detection: compare two snapshots of one listing field. */
export function detectChangedField<T>(
  fieldName: string,
  before: T | null,
  after: T | null,
): { changed: boolean; fieldName: string } {
  const beforeJson = before === null ? null : JSON.stringify(before);
  const afterJson = after === null ? null : JSON.stringify(after);
  return { changed: beforeJson !== afterJson, fieldName };
}
