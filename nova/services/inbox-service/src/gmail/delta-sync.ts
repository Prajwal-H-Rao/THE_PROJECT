/**
 * Delta sync cursor store.
 * Persists the last page token per poll cursor so the next poll resumes
 * from where the previous one ended.
 */

export interface DeltaCursor {
  readonly userId: string;
  readonly lastPageToken: string | null;
  readonly lastProcessedAt: string | null;
}

export class DeltaSyncCursorStore {
  private cursors: Map<string, DeltaCursor> = new Map();

  /** Read one cursor for one user. Returns null if not seen before. */
  get(userId: string): DeltaCursor | null {
    return this.cursors.get(userId) ?? null;
  }

  /** Save one cursor after a poll. */
  set(userId: string, cursor: DeltaCursor): void {
    this.cursors.set(userId, cursor);
  }

  /** Clear all cursors (test helper). */
  clear(): void {
    this.cursors.clear();
  }

  /** Count of tracked cursors. */
  size(): number {
    return this.cursors.size;
  }
}
