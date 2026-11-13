/**
 * DLQ - Dead Letter Queue (task 16.3).
 * Stores messages that cannot be processed after retries.
 */

export interface DLQEntry {
  readonly messageId: string;
  readonly queueName: string;
  readonly payload: string;
  error: string;
  retryCount: number;
  firstFailedAt: string;
  lastAttemptAt: string;
}

export class DLQ {
  private queue: DLQEntry[] = [];
  private byId: Map<string, DLQEntry> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize;
  }

  enqueue(messageId: string, queueName: string, payload: string, error: string): void {
    const now = new Date().toISOString();
    const existing = this.byId.get(messageId);
    if (existing) {
      existing.retryCount += 1;
      existing.lastAttemptAt = now;
      existing.error = error;
    } else {
      const entry: DLQEntry = {
        messageId,
        queueName,
        payload,
        error,
        retryCount: 1,
        firstFailedAt: now,
        lastAttemptAt: now,
      };
      if (this.queue.length >= this.maxSize) {
        const oldest = this.queue.shift();
        if (oldest) {
          this.byId.delete(oldest.messageId);
        }
      }
      this._push(entry);
    }
  }

  private _push(entry: DLQEntry): void {
    this.queue.push(entry);
    this.byId.set(entry.messageId, entry);
  }

  get(messageId: string): DLQEntry | undefined {
    return this.byId.get(messageId);
  }

  getAll(): DLQEntry[] {
    return [...this.queue];
  }

  getByQueue(queueName: string): DLQEntry[] {
    return this.queue.filter(e => e.queueName === queueName);
  }

  markProcessed(messageId: string): boolean {
    const idx = this.queue.findIndex(e => e.messageId === messageId);
    if (idx === -1) return false;
    this.queue.splice(idx, 1);
    this.byId.delete(messageId);
    return true;
  }

  clear(): void {
    this.queue.length = 0;
    this.byId.clear();
  }

  count(): number {
    return this.queue.length;
  }

  countByQueue(queueName: string): number {
    return this.queue.filter(e => e.queueName === queueName).length;
  }
}

export const dlq = new DLQ();
