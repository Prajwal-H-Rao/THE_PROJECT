/**
 * Telegram update offset store (task 14.7).
 * Spec:765 - records Telegram update_id and message/callback identifiers for
 * deduplication. Returns promptly after durable queueing.
 * Retry must not double-process - an already-processed update_id is rejected.
 */

export class OffsetStore {
  private readonly processedIds = new Set<string>();

  /**
   * Check whether an update_id has already been processed.
   * Returns true if the update_id was already seen (duplicate - reject).
   * Returns false if the update_id is new (record it and process).
   */
  isDuplicate(updateId: string): boolean {
    if (this.processedIds.has(updateId)) {
      return true;
    }
    this.processedIds.add(updateId);
    return false;
  }

  /** Return the number of processed update IDs. */
  get count(): number {
    return this.processedIds.size;
  }

  /** Clear all stored update IDs (for testing). */
  clear(): void {
    this.processedIds.clear();
  }
}
