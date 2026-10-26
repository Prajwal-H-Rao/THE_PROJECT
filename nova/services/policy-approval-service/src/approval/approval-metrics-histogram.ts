/** Wait time histogram utilities for approval metrics (Task 15). */

import type { GrantRecord } from "./grant-binding.js";

/** Histogram bucket upper bounds (milliseconds). */
export const WAIT_HISTOGRAM_BUCKETS = [
  100, 500, 1000, 2000, 5000, 10000, 30000, 60000, 120000, 300000, 600000, 1800000, 3600000, Infinity
] as const;

/** Histogram bucket for wait times. */
export interface WaitHistogram {
  readonly buckets: Map<number, number>; // upper bound -> count
  sum: number;
  count: number;
}

/** Key for service:action grouping. */
export function metricsKey(service: string, action: string): string {
  return `${service}:${action}`;
}

/** Create a new empty histogram. */
export function createHistogram(): WaitHistogram {
  const buckets = new Map<number, number>();
  for (const b of WAIT_HISTOGRAM_BUCKETS) {
    buckets.set(b, 0);
  }
  return { buckets, sum: 0, count: 0 };
}

/** Record a wait time in the histogram. */
export function recordWait(hist: WaitHistogram, waitedMs: number): void {
  hist.count += 1;
  hist.sum += waitedMs;
  for (const b of WAIT_HISTOGRAM_BUCKETS) {
    if (waitedMs <= b) {
      hist.buckets.set(b, (hist.buckets.get(b) ?? 0) + 1);
    }
  }
}

/** Get or create histogram for a service:action. */
export function getOrCreateHistogram(
  histograms: Map<string, WaitHistogram>,
  service: string,
  action: string
): WaitHistogram {
  const k = metricsKey(service, action);
  let hist = histograms.get(k);
  if (!hist) {
    hist = createHistogram();
    histograms.set(k, hist);
  }
  return hist;
}

/** Compute percentiles from histogram buckets. */
export function computePercentiles(hist: WaitHistogram): { p50: number; p95: number; p99: number } {
  let cumulative = 0;
  let p50 = Infinity, p95 = Infinity, p99 = Infinity;
  for (const [bucket, count] of hist.buckets) {
    cumulative += count;
    const ratio = cumulative / hist.count;
    if (ratio >= 0.5 && p50 === Infinity) p50 = bucket;
    if (ratio >= 0.95 && p95 === Infinity) p95 = bucket;
    if (ratio >= 0.99 && p99 === Infinity) p99 = bucket;
  }
  return { p50, p95, p99 };
}