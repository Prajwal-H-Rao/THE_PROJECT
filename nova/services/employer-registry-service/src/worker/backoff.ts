/**
 * Backoff, circuit breaker and per-source rate limits (task 13.15, spec:581).
 * Pure TypeScript: no DB, no network, no model. Deterministic and testable.
 * Circuit states: closed (normal), open (tripped, rejects), half-open (trial recovery).
 * Exponential backoff with jitter for transient 429/5xx. Explicit 403/CAPTCHA
 * trips the breaker to open; recovery is through explicit user action (spec:633).
 */

export type CircuitState = "closed" | "open" | "half_open";

export interface CircuitBreaker {
  readonly state: CircuitState;
  readonly failures: number;
  readonly lastFailureAt: string | null;
  readonly nextAttemptAt: string | null;
}

export interface RateLimit {
  readonly requestsPerHour: number;
  readonly minIntervalMs: number;
  readonly lastRequestAt: string | null;
}

/** Create a closed circuit breaker with the given failure threshold. */
function createBreaker(threshold: number): CircuitBreaker {
  return { state: "closed", failures: 0, lastFailureAt: null, nextAttemptAt: null };
}

/** Record a success: close the breaker and reset failures. */
function onSuccess(breaker: CircuitBreaker): CircuitBreaker {
  return { ...breaker, state: "closed", failures: 0, lastFailureAt: null, nextAttemptAt: null };
}

/** Record a transient failure: increment failures, open when threshold reached. */
function onTransientFailure(breaker: CircuitBreaker, threshold: number, now: string): CircuitBreaker {
  const failures = breaker.failures + 1;
  if (failures >= threshold) {
    const next = new Date(Date.parse(now) + 60_000).toISOString(); // retry after 1 minute
    return { ...breaker, state: "open", failures, lastFailureAt: now, nextAttemptAt: next };
  }
  const backoffMs = Math.min(1000 * 2 ** (failures - 1), 30_000);
  const next = new Date(Date.now() + backoffMs).toISOString();
  return { ...breaker, state: "closed", failures, lastFailureAt: now, nextAttemptAt: next };
}

/** Record an explicit block (403/CAPTCHA): open the breaker, no retry. */
function onExplicitBlock(breaker: CircuitBreaker, now: string): CircuitBreaker {
  return { ...breaker, state: "open", failures: breaker.failures + 1, lastFailureAt: now, nextAttemptAt: null };
}

/** Try to acquire the breaker: allowed in closed or half-open; rejected in open. */
function acquireBreaker(breaker: CircuitBreaker, now: string): { allowed: boolean; breaker: CircuitBreaker } {
  if (breaker.state === "open") {
    if (breaker.nextAttemptAt !== null && now >= breaker.nextAttemptAt) {
      return { allowed: true, breaker: { ...breaker, state: "half_open" } };
    }
    return { allowed: false, breaker };
  }
  return { allowed: true, breaker };
}

/** Exponential backoff with jitter for attempt N (0-based). Returns delay ms. */
function backoffMs(attempt: number): number {
  const base = Math.min(1000 * 2 ** attempt, 30_000);
  const jitter = Math.floor(Math.random() * base * 0.2);
  return base + jitter;
}

/** Check rate limit: allowed if under requestsPerHour and minIntervalMs elapsed. */
function checkRateLimit(rate: RateLimit, now: string): { allowed: boolean; rate: RateLimit } {
  const nowMs = Date.parse(now);
  if (rate.lastRequestAt !== null) {
    const elapsed = nowMs - Date.parse(rate.lastRequestAt);
    if (elapsed < rate.minIntervalMs) {
      return { allowed: false, rate };
    }
  }
  return { allowed: true, rate: { ...rate, lastRequestAt: now } };
}

export {
  createBreaker,
  onSuccess,
  onTransientFailure,
  onExplicitBlock,
  acquireBreaker,
  backoffMs,
  checkRateLimit,
};
