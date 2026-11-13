/**
 * Tests for DLQ (task 16.3).
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { DLQ } from "./dlq.js";

test("DLQ enqueue and get", () => {
  const dlq = new DLQ();
  dlq.enqueue("msg-1", "queue-1", '{"data": "test"}', "connection error");
  const entry = dlq.get("msg-1");
  assert.ok(entry !== undefined);
  assert.equal(entry!.messageId, "msg-1");
  assert.equal(entry!.queueName, "queue-1");
});

test("DLQ duplicate increments count", () => {
  const dlq = new DLQ();
  dlq.enqueue("msg-1", "queue-1", "{}", "err1");
  dlq.enqueue("msg-1", "queue-1", "{}", "err2");
  const entry = dlq.get("msg-1");
  assert.equal(entry!.retryCount, 2);
});

test("DLQ count by queue", () => {
  const dlq = new DLQ();
  dlq.enqueue("msg-1", "queue-1", "{}", "err");
  dlq.enqueue("msg-2", "queue-2", "{}", "err");
  assert.equal(dlq.countByQueue("queue-1"), 1);
  assert.equal(dlq.countByQueue("queue-2"), 1);
});

test("DLQ clear", function () {
  const dlq = new DLQ();
  dlq.enqueue("msg-1", "queue-1", "{}", "err");
  dlq.enqueue("msg-2", "queue-2", "{}", "err");
  assert.equal(dlq.count(), 2);
  dlq.clear();
  assert.equal(dlq.count(), 0);
  assert.equal(dlq.get("msg-1"), undefined);
});
