/**
 * Tests for polling worker: idempotent processing, page chaining, backoff.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { createMockGmailAdapter } from "./gmail-adapter.js";
import type { GmailListResult } from "./gmail-adapter.js";
import { IdempotencyStore } from "./idempotency.js";
import { DeltaSyncCursorStore } from "./delta-sync.js";
import { PollingWorker } from "./polling-worker.js";

interface RepoMock {
  insertMessage: (userId: string, messageId: string) => Promise<boolean>;
}

function makeRepo(claimResults: boolean[]): RepoMock {
  let index = 0;
  return {
    insertMessage: async () => claimResults[index++] ?? false,
  };
}

describe("PollingWorker", () => {
  it("processes new messages and skips already processed", async () => {
    const adapter = createMockGmailAdapter({ userId: "user-1" });
    adapter.addMessage({ id: "msg-1", from: "a@x.com", subject: "S1", snippet: "", receivedAt: "t", labels: [], bodyRef: null });
    adapter.addMessage({ id: "msg-2", from: "b@x.com", subject: "S2", snippet: "", receivedAt: "t", labels: [], bodyRef: null });
    adapter.addMessage({ id: "msg-3", from: "c@x.com", subject: "S3", snippet: "", receivedAt: "t", labels: [], bodyRef: null });

    const store = new IdempotencyStore();
    const cursorStore = new DeltaSyncCursorStore();
    const repo = makeRepo([true, true, true]);
    const worker = new PollingWorker(adapter, store, cursorStore, repo, {
      userId: "user-1",
      pageSize: 2,
      pollIntervalMs: 1,
    });

    const result = await worker.poll();
    assert.strictEqual(result.processed, 3);
    assert.strictEqual(result.skipped, 0);

    // Second poll skips all three (in-memory cache prevents re-claim)
    const result2 = await worker.poll();
    assert.strictEqual(result2.processed, 0);
    assert.strictEqual(result2.skipped, 3);
  });

  it("chains pages across page tokens", async () => {
    const adapter = createMockGmailAdapter({ userId: "user-1" });
    for (let i = 1; i <= 5; i++) {
      adapter.addMessage({ id: `msg-${i}`, from: `u${i}@x.com`, subject: `S${i}`, snippet: "", receivedAt: "t", labels: [], bodyRef: null });
    }

    const store = new IdempotencyStore();
    const cursorStore = new DeltaSyncCursorStore();
    const repo = makeRepo([true, true, true, true, true]);
    const worker = new PollingWorker(adapter, store, cursorStore, repo, {
      userId: "user-1",
      pageSize: 2,
      pollIntervalMs: 1,
    });

    const result = await worker.poll();
    assert.strictEqual(result.processed, 5);
  });

  it("backoff retries on rate-limited error then succeeds", async () => {
    let calls = 0;
    const adapter = createMockGmailAdapter({ userId: "user-1" });
    const originalList = adapter.list.bind(adapter);
    adapter.list = async (...args: unknown[]) => {
      calls += 1;
      if (calls === 1) {
        throw new Error("429 Too Many Requests");
      }
      return (originalList as (...a: unknown[]) => unknown).apply(adapter, args) as Promise<GmailListResult>;
    };
    adapter.addMessage({ id: "msg-1", from: "a@x.com", subject: "S1", snippet: "", receivedAt: "t", labels: [], bodyRef: null });

    const store = new IdempotencyStore();
    const cursorStore = new DeltaSyncCursorStore();
    const repo = makeRepo([true]);
    const worker = new PollingWorker(adapter, store, cursorStore, repo, {
      userId: "user-1",
      pageSize: 50,
      baseBackoffMs: 10,
      maxBackoffMs: 100,
      pollIntervalMs: 1,
    });

    const result = await worker.poll();
    assert.strictEqual(result.processed, 1);
    assert.strictEqual(calls, 2);
  });

  it("skips messages already claimed by DB (ON CONFLICT)", async () => {
    const adapter = createMockGmailAdapter({ userId: "user-1" });
    adapter.addMessage({ id: "msg-1", from: "a@x.com", subject: "S1", snippet: "", receivedAt: "t", labels: [], bodyRef: null });

    // First claim succeeds
    const store1 = new IdempotencyStore();
    const cursorStore1 = new DeltaSyncCursorStore();
    const repo1 = makeRepo([true]);
    const worker1 = new PollingWorker(adapter, store1, cursorStore1, repo1, {
      userId: "user-1",
      pageSize: 50,
      pollIntervalMs: 1,
    });
    const r1 = await worker1.poll();
    assert.strictEqual(r1.processed, 1);

    // Second claim on same message fails (ON CONFLICT) -> skipped
    const store2 = new IdempotencyStore();
    const cursorStore2 = new DeltaSyncCursorStore();
    const repo2 = makeRepo([false]);
    const worker2 = new PollingWorker(adapter, store2, cursorStore2, repo2, {
      userId: "user-1",
      pageSize: 50,
      pollIntervalMs: 1,
    });
    const r2 = await worker2.poll();
    assert.strictEqual(r2.processed, 0);
    assert.strictEqual(r2.skipped, 1);
  });
});
