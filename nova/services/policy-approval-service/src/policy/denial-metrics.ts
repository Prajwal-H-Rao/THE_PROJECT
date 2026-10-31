/** Denial metrics for Module 04 Scope Lock (Task 18).
 *  Logs denial reason codes and counts them as metrics.
 *  Provides Prometheus-formatted output and alerting thresholds. */

export enum DenialCode {
  NO_MATCHING_RULE = "no_matching_rule",
  IDENTITY_REQUIRED = "identity_required",
  OWNERSHIP_MISMATCH = "ownership_mismatch",
  QUOTA_EXCEEDED = "quota_exceeded",
  POLICY_VERSION_MISMATCH = "policy_version_mismatch",
  GRANT_EXPIRED = "grant_expired",
  GRANT_REVOKED = "grant_revoked",
  GRANT_ALREADY_USED = "grant_already_used",
  ACTION_MISMATCH = "action_mismatch",
  PAYLOAD_HASH_MISMATCH = "payload_hash_mismatch",
  CHAT_APPROVAL_NOT_ALLOWED = "chat_approval_not_allowed",
  DENIED_OPERATION = "denied_operation",
  INVALID_REQUEST = "invalid_request",
  SELF_EXTENSION_PROHIBITED = "self_extension_prohibited",
}

export interface DenialMetricsSnapshot {
  counts: Record<DenialCode, number>;
  total: number;
  ratePerSecond: number;
  timestamp: number;
}

export interface AlertThresholds {
  denialRatePerMinute: number;
  deniedOperationSpike: number;
  selfExtensionAttempts: number;
}

export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  denialRatePerMinute: 100,
  deniedOperationSpike: 50,
  selfExtensionAttempts: 10,
};

/** Thread-safe denial metrics collector. */
export class DenialMetrics {
  private counts: Map<DenialCode, number> = new Map();
  private lastReset: number = Date.now();
  private lock: Promise<void> = Promise.resolve();

  constructor() {
    // Initialize all denial codes to 0
    for (const code of Object.values(DenialCode)) {
      this.counts.set(code, 0);
    }
  }

  /** Record a denial occurrence. */
  recordDenial(code: DenialCode): void {
    const current = this.counts.get(code) ?? 0;
    this.counts.set(code, current + 1);
  }

  /** Get count for a specific denial code. */
  getCount(code: DenialCode): number {
    return this.counts.get(code) ?? 0;
  }

  /** Get all denial counts. */
  getAllCounts(): Record<DenialCode, number> {
    const result: Record<DenialCode, number> = {} as Record<DenialCode, number>;
    for (const [code, count] of this.counts.entries()) {
      result[code] = count;
    }
    return result;
  }

  /** Get total number of denials. */
  getTotalDenials(): number {
    let total = 0;
    for (const count of this.counts.values()) {
      total += count;
    }
    return total;
  }

  /** Get denial rate per second. */
  getDenialRate(): number {
    const elapsed = (Date.now() - this.lastReset) / 1000;
    if (elapsed === 0) return 0;
    return this.getTotalDenials() / elapsed;
  }

  /** Reset all counters. */
  reset(): void {
    this.counts.clear();
    for (const code of Object.values(DenialCode)) {
      this.counts.set(code, 0);
    }
    this.lastReset = Date.now();
  }

  /** Get a snapshot of current metrics. */
  getSnapshot(): DenialMetricsSnapshot {
    return {
      counts: this.getAllCounts(),
      total: this.getTotalDenials(),
      ratePerSecond: this.getDenialRate(),
      timestamp: Date.now(),
    };
  }

  /** Format metrics in Prometheus exposition format. */
  formatPrometheus(): string {
    const lines: string[] = [
      "# HELP nova_denials_total Total number of policy denials by reason code",
      "# TYPE nova_denials_total counter",
    ];

    const counts = this.getAllCounts();
    for (const [code, count] of Object.entries(counts)) {
      lines.push(`nova_denials_total{reason="${code}"} ${count}`);
    }

    lines.push(
      "",
      "# HELP nova_denials_rate_per_second Current denial rate per second",
      "# TYPE nova_denials_rate_per_second gauge",
    );
    lines.push(`nova_denials_rate_per_second ${this.getDenialRate().toFixed(6)}`);

    lines.push(
      "",
      "# HELP nova_denials_total_all Total denials across all reasons",
      "# TYPE nova_denials_total_all counter",
    );
    lines.push(`nova_denials_total_all ${this.getTotalDenials()}`);

    return lines.join("\n") + "\n";
  }
}

/** Global singleton instance. */
let globalMetrics: DenialMetrics | null = null;

/** Get the global denial metrics singleton. */
export function getDenialMetrics(): DenialMetrics {
  if (!globalMetrics) {
    globalMetrics = new DenialMetrics();
  }
  return globalMetrics;
}

/** Replace the global denial metrics (for testing). */
export function configureDenialMetrics(metrics: DenialMetrics): void {
  globalMetrics = metrics;
}

/** Record a denial using the global metrics. */
export function recordDenial(code: DenialCode): void {
  getDenialMetrics().recordDenial(code);
}

/** Check if any alert thresholds are exceeded. */
export function checkAlerts(
  metrics: DenialMetrics,
  thresholds: AlertThresholds = DEFAULT_ALERT_THRESHOLDS
): string[] {
  const alerts: string[] = [];
  const counts = metrics.getAllCounts();

  // Denial rate alert
  const ratePerMinute = metrics.getDenialRate() * 60;
  if (ratePerMinute > thresholds.denialRatePerMinute) {
    alerts.push(
      `HIGH_DENIAL_RATE: ${ratePerMinute.toFixed(1)} denials/minute (threshold: ${thresholds.denialRatePerMinute})`
    );
  }

  // Specific denial type spikes
  const deniedOps = counts[DenialCode.DENIED_OPERATION] ?? 0;
  if (deniedOps > thresholds.deniedOperationSpike) {
    alerts.push(
      `DENIED_OPERATION_SPIKE: ${deniedOps} denied operations (threshold: ${thresholds.deniedOperationSpike})`
    );
  }

  const selfExt = counts[DenialCode.SELF_EXTENSION_PROHIBITED] ?? 0;
  if (selfExt > thresholds.selfExtensionAttempts) {
    alerts.push(
      `SELF_EXTENSION_ATTEMPTS: ${selfExt} self-extension attempts (threshold: ${thresholds.selfExtensionAttempts})`
    );
  }

  return alerts;
}
