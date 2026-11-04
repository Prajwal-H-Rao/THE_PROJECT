/**
 * Object store interface for offloaded note bodies.
 * Stores long note bodies outside the database to keep note rows small.
 */

import { randomUUID } from "crypto";

/** DI token for the note object store. Shared by the repository and the searcher. */
export const OBJECT_STORE = "OBJECT_STORE";

export interface ObjectStore {
  /** Store a body under a key. Returns the stored key. */
  upload(key: string, body: string): Promise<void>;

  /** Retrieve a body by key. Returns null if not found. */
  download(key: string): Promise<string | null>;

  /** Delete a body by key. Returns true if deleted. */
  delete(key: string): Promise<boolean>;
}

/** Build an object storage key from userId and purpose string. */
let keyCounter = 0;
export function buildKey(userId: string, purpose: string): string {
  keyCounter += 1;
  return `obj://${userId}/${purpose}/${keyCounter}`;
}

/** In-memory object store implementation for tests. */
export class InMemoryObjectStore implements ObjectStore {
  private readonly store = new Map<string, string>();

  /** Store a body under a key. Returns the stored key. */
  async upload(key: string, body: string): Promise<void> {
    this.store.set(key, body);
  }

  /** Retrieve a body by key. Returns null if not found. */
  async download(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  /** Delete a body by key. Returns true if deleted. */
  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }
}
