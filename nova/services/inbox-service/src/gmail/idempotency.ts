/**
 * Idempotent mail processing keyed on Gmail message ID.
 * Uses DB UNIQUE constraint (user_id, message_id) as the dedup mechanism.
 * Key format: gmail:{messageId}.
 * claimAndRecord is a read-only pre-check cache; the DB INSERT ... ON CONFLICT
 * is the sole authoritative claim gate.
 */

export function makeIdempotencyKey(messageId: string): string {
  return `gmail:${messageId}`;
}

export interface ProcessedRecord {
  readonly key: string;
  readonly processedAt: string;
}

export class IdempotencyStore {
  private processed: Map<string, ProcessedRecord> = new Map();

  /** Read-only check: returns true if the key was seen before in this process.
   * Does NOT claim the key. The DB insert is the authoritative claim. */
  async isProcessed(key: string): Promise<boolean> {
    return this.processed.has(key);
  }

  /** Record one processed key after a successful DB insert.
   * Call only after repository.insertMessage returns true (new insert). */
  async record(key: string): Promise<void> {
    this.processed.set(key, {
      key,
      processedAt: new Date().toISOString(),
    });
  }

  /** Clear all records (test helper). */
  clear(): void {
    this.processed.clear();
  }

  /** Count of processed records. */
  size(): number {
    return this.processed.size;
  }
}
