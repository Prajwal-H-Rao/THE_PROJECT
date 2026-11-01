/**
 * Tests for delta sync cursor store.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { DeltaSyncCursorStore } from "./delta-sync.js";

describe("DeltaSyncCursorStore", () => {
  it("returns null for unseen user", () => {
    const store = new DeltaSyncCursorStore();
    assert.strictEqual(store.get("user-1"), null);
  });

  it("stores and reads one cursor", () => {
    const store = new DeltaSyncCursorStore();
    store.set("user-1", {
      userId: "user-1",
      lastPageToken: "abc",
      lastProcessedAt: "2026-10-01T10:00:00Z",
    });
    const cursor = store.get("user-1");
    assert.ok(cursor);
    assert.strictEqual(cursor!.userId, "user-1");
    assert.strictEqual(cursor!.lastPageToken, "abc");
    assert.strictEqual(cursor!.lastProcessedAt, "2026-10-01T10:00:00Z");
  });

  it("tracks separate cursors per user", () => {
    const store = new DeltaSyncCursorStore();
    store.set("user-1", {
      userId: "user-1",
      lastPageToken: "a",
      lastProcessedAt: "t1",
    });
    store.set("user-2", {
      userId: "user-2",
      lastPageToken: "b",
      lastProcessedAt: "t2",
    });
    assert.strictEqual(store.get("user-1")!.lastPageToken, "a");
    assert.strictEqual(store.get("user-2")!.lastPageToken, "b");
    assert.strictEqual(store.size(), 2);
  });

  it("clears all cursors", () => {
    const store = new DeltaSyncCursorStore();
    store.set("user-1", {
      userId: "user-1",
      lastPageToken: "a",
      lastProcessedAt: "t1",
    });
    assert.strictEqual(store.size(), 1);
    store.clear();
    assert.strictEqual(store.size(), 0);
    assert.strictEqual(store.get("user-1"), null);
  });
});
