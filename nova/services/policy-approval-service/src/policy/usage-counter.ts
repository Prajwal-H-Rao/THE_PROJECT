/** In-process per-user daily usage counter for Layer 4 quota (Module 04 Task 6).
 *
 * This is a budget guard, not a security property of Layer 4. It is documented
 * that reset on restart under-counts; the durable SQL counter with schema
 * migration moves in the later grants-to-SQL task.
 */

const DAY_SECONDS = 86400;

export class UsageCounter {
  private readonly limit: number;
  private readonly counts = new Map<string, number>();

  constructor(limit: number = 1000) {
    this.limit = limit;
  }

  private dayKey(userId: string): string {
    const day = Math.floor(Date.now() / 1000 / DAY_SECONDS);
    return `${userId}:${day}`;
  }

  /** Returns [allowed, remaining]. If denied, remaining is 0. */
  checkAndIncrement(userId: string): [boolean, number] {
    const key = this.dayKey(userId);
    const current = this.counts.get(key) ?? 0;
    if (current >= this.limit) {
      return [false, 0];
    }
    this.counts.set(key, current + 1);
    return [true, this.limit - current - 1];
  }

  getRemaining(userId: string): number {
    const key = this.dayKey(userId);
    const current = this.counts.get(key) ?? 0;
    return Math.max(0, this.limit - current);
  }

  /** For tests only. */
  reset(userId?: string): void {
    if (userId) {
      for (const k of this.counts.keys()) {
        if (k.startsWith(`${userId}:`)) {
          this.counts.delete(k);
        }
      }
    } else {
      this.counts.clear();
    }
  }
}

// Global singleton configured at service startup.
let usageCounter: UsageCounter | null = null;

export function getUsageCounter(): UsageCounter {
  if (!usageCounter) {
    usageCounter = new UsageCounter();
  }
  return usageCounter;
}

export function configureUsageCounter(limit: number): void {
  usageCounter = new UsageCounter(limit);
}