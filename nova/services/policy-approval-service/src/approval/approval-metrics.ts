/** Approval wait and expiry metrics (Task 15).
 *  In-memory counters and histograms for observability. */

import type { GrantRecord } from "./grant-binding.js";
import {
  metricsKey,
  getOrCreateHistogram,
  recordWait,
  computePercentiles,
  WAIT_HISTOGRAM_BUCKETS,
} from "./approval-metrics-histogram.js";

/** A single metric point. */
export interface MetricPoint {
  readonly name: string;
  readonly value: number;
  readonly labels: Record<string, string>;
  readonly timestampMs: number;
}

/** Expiry event record. */
export interface ExpiryEvent {
  readonly nonce: string;
  readonly userId: string;
  readonly service: string;
  readonly action: string;
  readonly expiredAtMs: number;
  readonly waitedMs: number;
}

/** In-memory metrics store. */
export class ApprovalMetrics {
  private readonly waitHistograms = new Map<string, ReturnType<typeof getOrCreateHistogram>>();
  private readonly expiryEvents: ExpiryEvent[] = [];
  private readonly createdCounter = new Map<string, number>();
  private readonly consumedCounter = new Map<string, number>();
  private readonly approvedCounter = new Map<string, number>();
  private readonly rejectedCounter = new Map<string, number>();
  private readonly expiredCounter = new Map<string, number>();
  private readonly revokedCounter = new Map<string, number>();
  private readonly errorsCounter = new Map<string, number>();

  /** Record a grant creation. */
  recordCreated(record: GrantRecord): void {
    const k = metricsKey(record.service, record.action);
    this.createdCounter.set(k, (this.createdCounter.get(k) ?? 0) + 1);
  }

  /** Record a grant consumption (approval wait time). */
  recordConsumed(record: GrantRecord, consumedAtMs: number): void {
    const k = metricsKey(record.service, record.action);
    this.consumedCounter.set(k, (this.consumedCounter.get(k) ?? 0) + 1);

    const waitedMs = consumedAtMs - record.createdAtMs;
    const hist = getOrCreateHistogram(this.waitHistograms, record.service, record.action);
    recordWait(hist, waitedMs);
  }

  /** Record a grant approval. */
  recordApproved(record: GrantRecord, decidedAtMs: number): void {
    const k = metricsKey(record.service, record.action);
    this.approvedCounter.set(k, (this.approvedCounter.get(k) ?? 0) + 1);
    const waitedMs = decidedAtMs - record.createdAtMs;
    const hist = getOrCreateHistogram(this.waitHistograms, record.service, record.action);
    recordWait(hist, waitedMs);
  }

  /** Record a grant rejection. */
  recordRejected(record: GrantRecord, _decidedAtMs: number): void {
    const k = metricsKey(record.service, record.action);
    this.rejectedCounter.set(k, (this.rejectedCounter.get(k) ?? 0) + 1);
  }

  /** Record a grant expiry. */
  recordExpired(record: GrantRecord, expiredAtMs: number): void {
    const k = metricsKey(record.service, record.action);
    this.expiredCounter.set(k, (this.expiredCounter.get(k) ?? 0) + 1);

    const waitedMs = expiredAtMs - record.createdAtMs;
    this.expiryEvents.push({
      nonce: record.nonce,
      userId: record.userId,
      service: record.service,
      action: record.action,
      expiredAtMs,
      waitedMs,
    });
    if (this.expiryEvents.length > 1000) {
      this.expiryEvents.shift();
    }
  }

  /** Record a grant revocation. */
  recordRevoked(record: GrantRecord, _revokedAtMs: number): void {
    const k = metricsKey(record.service, record.action);
    this.revokedCounter.set(k, (this.revokedCounter.get(k) ?? 0) + 1);
  }

  /** Record an error. */
  recordError(code: string): void {
    this.errorsCounter.set(code, (this.errorsCounter.get(code) ?? 0) + 1);
  }

  /** Get all metrics as a flat array of MetricPoint. */
  getAll(): MetricPoint[] {
    const now = Date.now();
    const points: MetricPoint[] = [];

    function pushCounter(prefix: string, counter: Map<string, number>): void {
      for (const [k, v] of counter) {
        const parts = k.split(":");
        const service = parts[0] ?? "unknown";
        const action = parts[1] ?? "unknown";
        points.push({ name: prefix, value: v, labels: { service, action }, timestampMs: now });
      }
    }

    pushCounter("approval_grant_created_total", this.createdCounter);
    pushCounter("approval_grant_consumed_total", this.consumedCounter);
    pushCounter("approval_grant_approved_total", this.approvedCounter);
    pushCounter("approval_grant_rejected_total", this.rejectedCounter);
    pushCounter("approval_grant_expired_total", this.expiredCounter);
    pushCounter("approval_grant_revoked_total", this.revokedCounter);

    for (const [code, v] of this.errorsCounter) {
      points.push({ name: "approval_errors_total", value: v, labels: { code }, timestampMs: now });
    }

    for (const [k, hist] of this.waitHistograms) {
      const parts = k.split(":");
      const service = parts[0] ?? "unknown";
      const action = parts[1] ?? "unknown";
      points.push({ name: "approval_wait_seconds_count", value: hist.count, labels: { service, action }, timestampMs: now });
      points.push({ name: "approval_wait_seconds_sum", value: hist.sum / 1000, labels: { service, action }, timestampMs: now });
      for (const [bucket, count] of hist.buckets) {
        const le = bucket === Infinity ? "+Inf" : String(bucket / 1000);
        points.push({ name: "approval_wait_seconds_bucket", value: count, labels: { service, action, le }, timestampMs: now });
      }
    }

    return points;
  }

  /** Get recent expiry events. */
  getExpiryEvents(limit = 100): ExpiryEvent[] {
    return this.expiryEvents.slice(-limit);
  }

  /** Get wait time statistics for a service:action. */
  getWaitStats(service: string, action: string): { count: number; sumMs: number; avgMs: number; p50Ms: number; p95Ms: number; p99Ms: number } | null {
    const k = metricsKey(service, action);
    const hist = this.waitHistograms.get(k);
    if (!hist || hist.count === 0) {
      return null;
    }
    const { p50, p95, p99 } = computePercentiles(hist);
    return {
      count: hist.count,
      sumMs: hist.sum,
      avgMs: hist.sum / hist.count,
      p50Ms: p50 === Infinity ? hist.sum / hist.count : p50,
      p95Ms: p95 === Infinity ? hist.sum / hist.count : p95,
      p99Ms: p99 === Infinity ? hist.sum / hist.count : p99,
    };
  }

  /** Reset all metrics (for testing). */
  reset(): void {
    this.waitHistograms.clear();
    this.expiryEvents.length = 0;
    this.createdCounter.clear();
    this.consumedCounter.clear();
    this.approvedCounter.clear();
    this.rejectedCounter.clear();
    this.expiredCounter.clear();
    this.revokedCounter.clear();
    this.errorsCounter.clear();
  }
}

/** Global singleton instance. */
export const approvalMetrics = new ApprovalMetrics();