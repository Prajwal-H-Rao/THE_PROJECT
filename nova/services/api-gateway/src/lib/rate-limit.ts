/** The fixed window limiter. It bounds the number of tracked keys. */

/** The largest number of tracked keys. The limiter evicts the oldest keys over it. */
export const DEFAULT_MAX_KEYS = 10_000;

/** The window of one key. */
interface Window {
  count: number;
  resetAt: number;
}

/** The limiter. It counts the requests per key in a fixed window. */
export class RateLimiter {
  private readonly windows = new Map<string, Window>();

  /** Create the limiter. It holds the max count, the window length and the key cap. */
  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly maxKeys: number = DEFAULT_MAX_KEYS,
  ) {}

  /** Count one request. Return the seconds to wait when the key is over the limit. */
  check(key: string, now: number): number {
    const window = this.windows.get(key);
    if (window === undefined || window.resetAt <= now) {
      this.windows.set(key, { count: 1, resetAt: now + this.windowMs });
      this.bound(now);
      return 0;
    }
    window.count += 1;
    this.bound(now);
    if (window.count <= this.max) {
      return 0;
    }
    return Math.max(1, Math.ceil((window.resetAt - now) / 1000));
  }

  /** Drop the expired windows and the oldest keys when the map grows over the cap. */
  private bound(now: number): void {
    if (this.windows.size <= this.maxKeys) {
      return;
    }
    for (const [key, window] of this.windows) {
      if (window.resetAt <= now) {
        this.windows.delete(key);
      }
    }
    while (this.windows.size > this.maxKeys) {
      const oldest = this.windows.keys().next();
      if (oldest.done === true) {
        return;
      }
      this.windows.delete(oldest.value);
    }
  }
}
