/**
 * Tests for MessageRepository - durable dedup gate via SQL ON CONFLICT.
 * Uses a mock pg Pool to verify INSERT ... ON CONFLICT behavior.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { Pool } from "pg";
import { MessageRepository } from "./message-repository.js";

function mockPool(insertResults: boolean[]): Pool {
  let index = 0;
  return {
    query: async (_text: string, _values: unknown[]) => {
      const claimed = insertResults[index++] ?? false;
      return {
        rows: claimed ? [{ message_id: "msg-1" }] : [],
        rowCount: claimed ? 1 : 0,
        fields: [],
        command: "",
        oid: 0,
      };
    },
  } as unknown as Pool;
}

describe("MessageRepository", () => {
  it("insertMessage returns true for new message", async () => {
    const pool = mockPool([true]);
    const repo = new MessageRepository(pool);

    const claimed = await repo.insertMessage("user-1", "msg-1");
    assert.strictEqual(claimed, true);
  });

  it("insertMessage returns false for duplicate message", async () => {
    const pool = mockPool([false]);
    const repo = new MessageRepository(pool);

    const claimed = await repo.insertMessage("user-1", "msg-1");
    assert.strictEqual(claimed, false);
  });

  it("insertMessage handles alternating claims", async () => {
    const pool = mockPool([true, false, true, false]);
    const repo = new MessageRepository(pool);

    assert.strictEqual(await repo.insertMessage("user-1", "msg-1"), true);
    assert.strictEqual(await repo.insertMessage("user-1", "msg-1"), false);
    assert.strictEqual(await repo.insertMessage("user-1", "msg-2"), true);
    assert.strictEqual(await repo.insertMessage("user-1", "msg-2"), false);
  });
});
