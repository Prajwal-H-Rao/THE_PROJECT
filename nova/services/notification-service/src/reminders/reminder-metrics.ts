/**
 * Nova design system - Reminder metrics.
 * In-memory counters and histograms for task and reminder observability.
 * Tracks queue backlog, delivery latency, delivery outcomes, and dead letters.
 * Provides a checkAlert function that evaluates backlog against a threshold.
 */

/** A single metric point. */
export interface MetricPoint {
  readonly name: string;
  readonly value: number;
  readonly labels: Record<string, string>;
  readonly timestampMs: number;
}

/** Backlog alert threshold: pending reminders above this fire an alert. */
export const DEFAULT_BACKLOG_THRESHOLD = 100;

/** Histogram bucket upper bounds (milliseconds) for delivery latency. */
const LATENCY_BUCKETS = [
  1000, 5000, 10000, 30000, 60000, 120000, 300000, 600000, 1800000, 3600000, Infinity
] as const;

interface LatencyHistogram {
  readonly buckets: Map<number, number>;
  sum: number;
  count: number;
}

function createLatencyHistogram(): LatencyHistogram {
  const buckets = new Map<number, number>();
  for (const b of LATENCY_BUCKETS) {
    buckets.set(b, 0);
  }
  return { buckets, sum: 0, count: 0 };
}

function recordLatency(hist: LatencyHistogram, waitedMs: number): void {
  hist.count += 1;
  hist.sum += waitedMs;
  for (const b of LATENCY_BUCKETS) {
    if (waitedMs <= b) {
      hist.buckets.set(b, (hist.buckets.get(b) ?? 0) + 1);
    }
  }
}

/** ReminderMetrics records queue backlog, delivery latency, and outcomes. */
export class ReminderMetrics {
  private readonly latencyHistograms = new Map<string, LatencyHistogram>();
  private readonly deliveredCounter = new Map<string, number>();
  private readonly failedCounter = new Map<string, number>();
  private readonly escalatedCounter = new Map<string, number>();
  private readonly deadLetterCounter = new Map<string, number>();
  private pendingBacklog = 0;

  /** Record the current pending reminder backlog (gauge, rises and falls). */
  recordBacklog(pendingCount: number): void {
    this.pendingBacklog = pendingCount;
  }

  /** Record delivery latency from created_at to delivered_at.
   * Skips reminders that have not been delivered (deliveredAt null). */
  recordDeliveryLatency(createdAt: string, deliveredAt: string | null): void {
    if (!deliveredAt) return;
    const created = new Date(createdAt).getTime();
    const delivered = new Date(deliveredAt).getTime();
    if (isNaN(created) || isNaN(delivered)) return;
    const waitedMs = delivered - created;
    if (waitedMs < 0) return;
    const hist = this.getLatencyHistogram();
    recordLatency(hist, waitedMs);
  }

  /** Record one delivery outcome. */
  recordDelivery(outcome: "delivered" | "failed" | "escalated"): void {
    const map = this.outcomeMap(outcome);
    const k = "reminder";
    map.set(k, (map.get(k) ?? 0) + 1);
  }

  /** Record one dead letter. */
  recordDeadLetter(): void {
    this.deadLetterCounter.set("reminder", (this.deadLetterCounter.get("reminder") ?? 0) + 1);
  }

  /** Get all metrics as a flat array of MetricPoint. */
  getAll(): MetricPoint[] {
    const now = Date.now();
    const points: MetricPoint[] = [];

    points.push({
      name: "reminder_backlog_pending",
      value: this.pendingBacklog,
      labels: {},
      timestampMs: now,
    });

    for (const [k, v] of this.deliveredCounter) {
      points.push({ name: "reminder_delivered_total", value: v, labels: { outcome: k }, timestampMs: now });
    }
    for (const [k, v] of this.failedCounter) {
      points.push({ name: "reminder_failed_total", value: v, labels: { outcome: k }, timestampMs: now });
    }
    for (const [k, v] of this.escalatedCounter) {
      points.push({ name: "reminder_escalated_total", value: v, labels: { outcome: k }, timestampMs: now });
    }
    for (const [k, v] of this.deadLetterCounter) {
      points.push({ name: "reminder_dead_letter_total", value: v, labels: {}, timestampMs: now });
    }

    for (const [k, hist] of this.latencyHistograms) {
      points.push({ name: "reminder_latency_seconds_count", value: hist.count, labels: {}, timestampMs: now });
      points.push({ name: "reminder_latency_seconds_sum", value: hist.sum / 1000, labels: {}, timestampMs: now });
      for (const [bucket, count] of hist.buckets) {
        const le = bucket === Infinity ? "+Inf" : String(bucket / 1000);
        points.push({
          name: "reminder_latency_seconds_bucket",
          value: count,
          labels: { le },
          timestampMs: now,
        });
      }
    }

    return points;
  }

  private getLatencyHistogram(): LatencyHistogram {
    const k = "reminder";
    let hist = this.latencyHistograms.get(k);
    if (!hist) {
      hist = createLatencyHistogram();
      this.latencyHistograms.set(k, hist);
    }
    return hist;
  }

  private outcomeMap(outcome: "delivered" | "failed" | "escalated"): Map<string, number> {
    if (outcome === "delivered") return this.deliveredCounter;
    if (outcome === "failed") return this.failedCounter;
    return this.escalatedCounter;
  }
}

/** Evaluate backlog against a threshold. Returns alert state. */
export function checkAlert(metrics: ReminderMetrics, threshold: number): {
  readonly firing: boolean;
  readonly reason: string | null;
} {
  const points = metrics.getAll();
  const backlog = points.find((p) => p.name === "reminder_backlog_pending");
  if (!backlog) return { firing: false, reason: null };
  if (backlog.value > threshold) {
    return {
      firing: true,
      reason: `reminder backlog ${backlog.value} exceeds threshold ${threshold}`,
    };
  }
  return { firing: false, reason: null };
}
