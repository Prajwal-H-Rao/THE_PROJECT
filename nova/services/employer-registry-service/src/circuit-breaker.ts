/**
 * Circuit breaker for employer-registry service (task 16.2).
 * Protects against cascading failures when calling external providers.
 */

export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeoutMs: number;
  halfOpenMaxCalls: number;
}

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private halfOpenCalls = 0;

  constructor(
    readonly name: string,
    readonly failureThreshold: number = 5,
    readonly recoveryTimeoutMs: number = 30000,
    readonly halfOpenMaxCalls: number = 3,
  ) {}

  getState(): CircuitState {
    return this.state;
  }

  recordSuccess(): void {
    if (this.state === "half-open") {
      this.halfOpenCalls += 1;
      if (this.halfOpenCalls >= this.halfOpenMaxCalls) {
        this.state = "closed";
        this.failureCount = 0;
        this.lastFailureTime = null;
      }
    } else {
      this.failureCount = 0;
      this.state = "closed";
    }
  }

  recordFailure(): void {
    this.failureCount += 1;
    this.lastFailureTime = Date.now();
    if (this.state === "half-open") {
      this.state = "open";
      this.halfOpenCalls = 0;
    } else if (this.failureCount >= this.failureThreshold) {
      this.state = "open";
    }
  }

  canExecute(): boolean {
    if (this.state === "closed") {
      return true;
    }
    if (this.state === "open") {
      if (this.lastFailureTime !== null && Date.now() - this.lastFailureTime >= this.recoveryTimeoutMs) {
        this.state = "half-open";
        this.halfOpenCalls = 0;
        return true;
      }
      return false;
    }
    // half-open
    if (this.halfOpenCalls < this.halfOpenMaxCalls) {
      return true;
    }
    return false;
  }

  isOpen(): boolean {
    return this.state === "open";
  }
}
