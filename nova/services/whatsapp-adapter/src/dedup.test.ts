/**
 * Tests for the WhatsApp deduplication store (task 14.3).
 * Verifies message-ID deduplication: first occurrence accepted,
 * duplicates rejected.
 */

import * as assert from "node:assert";
import { test } from "node:test";
import { DedupStore } from "./dedup.js";

test("first occurrence of a message ID is not a duplicate", () => {
  const store = new DedupStore();
  assert.ok(!store.isDuplicate("msg-1"));
  assert.ok(!store.isDuplicate("msg-2"));
});

test("second occurrence of the same message ID is a duplicate", () => {
  const store = new DedupStore();
  store.isDuplicate("msg-1");
  assert.ok(store.isDuplicate("msg-1"));
  assert.ok(store.isDuplicate("msg-1"));
});

test("different message IDs are independent", () => {
  const store = new DedupStore();
  store.isDuplicate("msg-1");
  assert.ok(!store.isDuplicate("msg-2"));
  assert.ok(!store.isDuplicate("msg-3"));
});

test("count tracks the number of processed messages", () => {
  const store = new DedupStore();
  assert.equal(store.count, 0);
  store.isDuplicate("msg-1");
  assert.equal(store.count, 1);
  store.isDuplicate("msg-2");
  assert.equal(store.count, 2);
  store.isDuplicate("msg-1"); // duplicate, count unchanged
  assert.equal(store.count, 2);
});

test("clear resets the store", () => {
  const store = new DedupStore();
  store.isDuplicate("msg-1");
  store.isDuplicate("msg-2");
  assert.equal(store.count, 2);
  store.clear();
  assert.equal(store.count, 0);
  assert.ok(!store.isDuplicate("msg-1"));
});
