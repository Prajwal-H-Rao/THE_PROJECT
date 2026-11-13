/**
 * Webhook and delivery metrics (task 14.18).
 * Tracks delivery metrics for outbound messages: counts per status,
 * dedup counts, failure rates for observability.
 */

export interface WebhookMetrics {
  readonly totalReceived: number;
  readonly totalDelivered: number;
  readonly totalFailed: number;
  readonly totalDuplicate: number;
  readonly totalReplayRejected: number;
  readonly totalInvalidSignature: number;
  readonly messagesByStatus: Record<string, number>;
}

/** In-memory webhook metrics store. */
export class WebhookMetricsStore {
  private totalReceived = 0;
  private totalDelivered = 0;
  private totalFailed = 0;
  private totalDuplicate = 0;
  private totalReplayRejected = 0;
  private totalInvalidSignature = 0;
  private messagesByStatus: Record<string, number> = {};

  /** Record a received webhook. */
  recordReceived(): void {
    this.totalReceived++;
  }

  /** Record a delivered message. */
  recordDelivered(status: string): void {
    this.totalDelivered++;
    this.messagesByStatus[status] = (this.messagesByStatus[status] || 0) + 1;
  }

  /** Record a failed message. */
  recordFailed(): void {
    this.totalFailed++;
  }

  /** Record a duplicate message. */
  recordDuplicate(): void {
    this.totalDuplicate++;
  }

  /** Record a replay-rejected message. */
  recordReplayRejected(): void {
    this.totalReplayRejected++;
  }

  /** Record an invalid signature. */
  recordInvalidSignature(): void {
    this.totalInvalidSignature++;
  }

  /** Get the current metrics. */
  getMetrics(): WebhookMetrics {
    return {
      totalReceived: this.totalReceived,
      totalDelivered: this.totalDelivered,
      totalFailed: this.totalFailed,
      totalDuplicate: this.totalDuplicate,
      totalReplayRejected: this.totalReplayRejected,
      totalInvalidSignature: this.totalInvalidSignature,
      messagesByStatus: { ...this.messagesByStatus },
    };
  }

  /** Clear all metrics (for testing). */
  clear(): void {
    this.totalReceived = 0;
    this.totalDelivered = 0;
    this.totalFailed = 0;
    this.totalDuplicate = 0;
    this.totalReplayRejected = 0;
    this.totalInvalidSignature = 0;
    this.messagesByStatus = {};
  }
}
