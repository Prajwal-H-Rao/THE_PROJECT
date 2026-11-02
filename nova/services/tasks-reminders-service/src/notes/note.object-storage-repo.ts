/**
 * Note object storage handles upload/download/delete of long note bodies
 * in an object store. The repository delegates to this class.
 */

import { Injectable, Inject } from "@nestjs/common";
import type { ObjectStore } from "./note.object-storage.js";
import { buildKey } from "./note.object-storage.js";

@Injectable()
export class NoteObjectStorage {
  constructor(@Inject("OBJECT_STORE") private readonly objectStore: ObjectStore) {}

  /** Store a note body under a key. Returns the stored key. */
  async storeBody(key: string, body: string): Promise<void> {
    await this.objectStore.upload(key, body);
  }

  /** Retrieve a note body by key. Returns null if not found. */
  async retrieveBody(key: string): Promise<string | null> {
    return this.objectStore.download(key);
  }

  /** Delete a note body by key. Returns true if deleted. */
  async deleteBody(key: string): Promise<boolean> {
    return this.objectStore.delete(key);
  }

  /** Build an object storage key from userId and purpose. */
  buildKey(userId: string, purpose: string): string {
    return buildKey(userId, purpose);
  }
}
