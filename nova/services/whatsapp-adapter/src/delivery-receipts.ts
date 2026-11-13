/**
 * Delivery receipts (task 14.15).
 * Tracks delivery status for outbound messages. Records delivery status
 * (delivered, read, failed) for each outbound message so the user can see
 * delivery status in the UI.
 */

export interface DeliveryReceipt {
  readonly messageId: string;
  readonly status: "delivered" | "read" | "failed";
  readonly timestamp: string;
}

/** In-memory delivery receipt store. */
export class DeliveryReceiptStore {
  private readonly receipts = new Map<string, DeliveryReceipt>();

  /** Record a delivery receipt for a message. */
  record(receipt: DeliveryReceipt): void {
    this.receipts.set(receipt.messageId, receipt);
  }

  /** Get the delivery receipt for a message. */
  get(messageId: string): DeliveryReceipt | undefined {
    return this.receipts.get(messageId);
  }

  /** Return all delivery receipts. */
  getAll(): readonly DeliveryReceipt[] {
    return [...this.receipts.values()];
  }

  /** Clear all delivery receipts (for testing). */
  clear(): void {
    this.receipts.clear();
  }
}
