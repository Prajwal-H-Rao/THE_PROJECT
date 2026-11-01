/**
 * Exponential backoff for rate-limited polling.
 * Computes delay in milliseconds from attempt count.
 * Caps delay at maxMs. Returns 0 for non-rate-limited errors.
 */

export interface BackoffOptions {
  readonly baseMs: number;
  readonly maxMs: number;
}

export function computeBackoff(attempt: number, opts: BackoffOptions): number {
  const delay = opts.baseMs * Math.pow(2, attempt - 1);
  return Math.min(delay, opts.maxMs);
}

export function isRateLimited(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes("429");
  }
  return false;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
