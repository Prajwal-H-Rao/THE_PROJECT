/**
 * Nova design system - Ambiguous-import review queue (task 11.8, module 11).
 * Holds rows flagged as uncertain by the model-drafted categoriser and
 * surfaces only rows below a confidence threshold. Deterministic: same
 * queue state always yields the same output. Pure stdlib, no pg, no
 * credentials; categorize only, no movement of money.
 */

export interface QueuedRow {
  readonly transactionId: string;
  readonly category: string;
  readonly confidence: number; // 0.0 to 1.0
  readonly reason: string;
}

export interface ResolvedRow {
  readonly transactionId: string;
  readonly finalCategory: string;
}

// Purpose: maintain a FIFO queue of uncertain import rows. getUncertainRows
// returns only rows whose confidence is below a threshold (spec:
export class ReviewQueue {
  private readonly queue: QueuedRow[] = [];

  // Purpose: enqueue an import row awaiting review.
  enqueue(row: QueuedRow): void {
    this.queue.push({ ...row });
  }

  // Purpose: return only rows whose confidence is below the threshold
  // (uncertain rows), in enqueue order. Confirmed/high-confidence rows
  // are excluded.
  getUncertainRows(threshold: number): QueuedRow[] {
    return this.queue.filter((row) => row.confidence < threshold);
  }

  // Purpose: resolve (remove) a transaction from the queue once it has
  // been reviewed. No-op if the transaction is not queued.
  resolve(transactionId: string, finalCategory: string): void {
    const index = this.queue.findIndex((row) => row.transactionId === transactionId);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }
  }

  // Purpose: return all pending rows in enqueue order.
  getQueue(): QueuedRow[] {
    return [...this.queue];
  }
}
