/**
 * WhatsApp message-ID deduplication store (task 14.3).
 * Spec:773 - deduplicate inbound message IDs and status events.
 * Process retries idempotently - a duplicate message ID is a no-op.
 */

export class DedupStore {
  private readonly processedIds = new Set<string>();

  /**
   * Check whether a message ID has already been processed.
   * Returns true if the message ID was already seen (duplicate - skip).
   * Returns false if the message ID is new (record it and process).
   */
  isDuplicate(messageId: string): boolean {
    if (this.processedIds.has(messageId)) {
      return true;
    }
    this.processedIds.add(messageId);
    return false;
  }

  /** Return the number of processed message IDs. */
  get count(): number {
    return this.processedIds.size;
  }

  /** Clear all stored message IDs (for testing). */
  clear(): void {
    this.processedIds.clear();
  }
}
