/**
 * Tests for NoteRepository object storage integration.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { Pool } from "pg";
import { NoteRepository } from "./note.repository.js";
import { InMemoryObjectStore } from "./note.object-storage.js";
import type { CreateNoteInput, UpdateNoteInput } from "./note.entity.js";

function makeRepo(objectStore: InMemoryObjectStore) {
  let mockResult: any = { rows: [], rowCount: 0 };
  const mockPool = {
    query: async (_sql: string, values?: unknown[]) => {
      mockPool.lastQuery = _sql;
      mockPool.lastValues = values ?? [];
      return mockResult;
    },
    lastQuery: "",
    lastValues: [] as unknown[],
  };
  const repo = new NoteRepository(mockPool as unknown as Pool, objectStore);
  return { repo, mockPool, setResult: (r: any) => { mockResult = r; } };
}

describe("NoteRepository object storage", () => {
  it("create stores short body inline", async () => {
    const store = new InMemoryObjectStore();
    const { repo, setResult } = makeRepo(store);
    setResult({ rows: [{ note_id: "n-1", user_id: "user-1", title: "Short note", content: "Small body", tags: [], source_type: null, source_ref: null, object_store_pointer: null, is_archived: false, created_at: "t", updated_at: "t" }], rowCount: 1 });

    const note = await repo.create("user-1", {
      title: "Short note",
      content: "Small body",
      tags: [],
    });

    assert.strictEqual(note.content, "Small body");
    assert.strictEqual(note.objectStorePointer, null);
    assert.strictEqual(await store.download(""), null);
  });

  it("create uploads long body to object store", async () => {
    const store = new InMemoryObjectStore();
    const { repo, mockPool, setResult } = makeRepo(store);

    const longBody = "x".repeat(2000);
    setResult({ rows: [{ note_id: "n-1", user_id: "user-1", title: "Long note", content: "", tags: [], source_type: null, source_ref: null, object_store_pointer: "obj://user-1/note/1", is_archived: false, created_at: "t", updated_at: "t" }], rowCount: 1 });

    const note = await repo.create("user-1", {
      title: "Long note",
      content: "x".repeat(2000),
      tags: [],
    });

    assert.strictEqual(note.content, "");
    assert.ok(note.objectStorePointer);
    assert.strictEqual(note.objectStorePointer, "obj://user-1/note/1");
    // Regression: the bound pointer must be the bare uploaded key, not a
    // double-prefixed "obj://obj://..." string. The mock row masked this once.
    const boundPointer = mockPool.lastValues[6];
    assert.ok(typeof boundPointer === "string");
    assert.ok(!boundPointer.startsWith("obj://obj://"), "pointer must not double-prefix");
    assert.strictEqual(await store.download(boundPointer), longBody);
    const downloaded = await store.download(note.objectStorePointer as string);
    assert.strictEqual(downloaded, "x".repeat(2000));
  });

  it("findById downloads body from object store", async () => {
    const store = new InMemoryObjectStore();
    const { repo, setResult } = makeRepo(store);

    const longBody = "y".repeat(3000);
    const key = "obj://user-1/note/1";
    await store.upload(key, longBody);

    setResult({ rows: [{ note_id: "n-1", user_id: "user-1", title: "Long note", content: "", tags: [], source_type: null, source_ref: null, object_store_pointer: key, is_archived: false, created_at: "t", updated_at: "t" }], rowCount: 1 });

    const fetched = await repo.findById("user-1", "n-1");
    assert.ok(fetched);
    assert.strictEqual(fetched!.content, longBody);
    assert.strictEqual(fetched!.objectStorePointer, key);
  });

  it("update uploads new body when content grows", async () => {
    const store = new InMemoryObjectStore();
    const { repo, setResult } = makeRepo(store);

    const longBody = "z".repeat(2000);
    const key = "obj://user-1/note/2";
    await store.upload(key, longBody);
    setResult({ rows: [{ note_id: "n-1", user_id: "user-1", title: "Note", content: "Short body", tags: [], source_type: null, source_ref: null, object_store_pointer: null, is_archived: false, created_at: "t", updated_at: "t" }], rowCount: 1 });

    const note = await repo.create("user-1", {
      title: "Note",
      content: "Short body",
      tags: [],
    });

    setResult({ rows: [{ note_id: note.noteId, user_id: "user-1", title: "Note", content: "", tags: [], source_type: null, source_ref: null, object_store_pointer: key, is_archived: false, created_at: "t", updated_at: "t" }], rowCount: 1 });

    const updated = await repo.update("user-1", note.noteId, {
      content: longBody,
    });

    assert.ok(updated!.objectStorePointer);
    assert.ok(updated!.objectStorePointer.startsWith("obj://user-1/note/"));
  });

  it("update deletes old object when content shrinks", async () => {
    const store = new InMemoryObjectStore();
    const { repo, setResult } = makeRepo(store);

    const longBody = "a".repeat(2000);
    const key = "obj://user-1/note/1";
    await store.upload(key, longBody);
    setResult({ rows: [{ note_id: "n-1", user_id: "user-1", title: "Note", content: longBody, tags: [], source_type: null, source_ref: null, object_store_pointer: key, is_archived: false, created_at: "t", updated_at: "t" }], rowCount: 1 });

    const note = await repo.create("user-1", {
      title: "Note",
      content: longBody,
      tags: [],
    });

    const pointerBefore = note.objectStorePointer;
    assert.ok(pointerBefore);
    assert.ok(await store.download(pointerBefore));

    setResult({ rows: [{ note_id: note.noteId, user_id: "user-1", title: "Note", content: "Short", tags: [], source_type: null, source_ref: null, object_store_pointer: pointerBefore, is_archived: false, created_at: "t", updated_at: "t" }], rowCount: 1 });

    await repo.update("user-1", note.noteId, { content: "Short" });

    assert.strictEqual(await store.download(pointerBefore), null);
  });

  it("delete removes object from storage", async () => {
    const store = new InMemoryObjectStore();
    const { repo, setResult } = makeRepo(store);

    const longBody = "b".repeat(2000);
    const key = "obj://user-1/note/1";
    await store.upload(key, longBody);
    setResult({ rows: [{ note_id: "n-1", user_id: "user-1", title: "Note", content: longBody, tags: [], source_type: null, source_ref: null, object_store_pointer: key, is_archived: false, created_at: "t", updated_at: "t" }], rowCount: 1 });

    const note = await repo.create("user-1", {
      title: "Note",
      content: longBody,
      tags: [],
    });

    const pointer = note.objectStorePointer;
    assert.ok(pointer);
    assert.ok(await store.download(pointer));

    setResult({ rows: [{ note_id: note.noteId, object_store_pointer: pointer }], rowCount: 1 });

    await repo.delete("user-1", note.noteId);
    assert.strictEqual(await store.download(pointer), null);
  });

  it("delete does not fail when no object pointer", async () => {
    const store = new InMemoryObjectStore();
    const { repo, setResult } = makeRepo(store);

    setResult({ rows: [{ note_id: "n-1", user_id: "user-1", title: "Short note", content: "Small body", tags: [], source_type: null, source_ref: null, object_store_pointer: null, is_archived: false, created_at: "t", updated_at: "t" }], rowCount: 1 });

    const note = await repo.create("user-1", {
      title: "Short note",
      content: "Small body",
      tags: [],
    });

    setResult({ rows: [{ note_id: note.noteId }], rowCount: 1 });

    const deleted = await repo.delete("user-1", note.noteId);
    assert.strictEqual(deleted, true);
  });
});