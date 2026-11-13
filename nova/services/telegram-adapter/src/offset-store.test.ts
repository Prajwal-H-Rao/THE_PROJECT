/**
 * Tests for the Telegram offset store (task 14.7).
 * Verifies deduplication: first occurrence is accepted, duplicates are rejected.
 */

import * as assert from "node:assert";
import { test } from "node:test";
import { OffsetStore } from "./offset-store.js";

test("first occurrence of an update_id is not a duplicate", () => {
  const store = new OffsetStore();
  assert.ok(!store.isDuplicate("update-1"));
  assert.ok(!store.isDuplicate("update-2"));
});

test("second occurrence of the same update_id is a duplicate", () => {
  const store = new OffsetStore();
  store.isDuplicate("update-1");
  assert.ok(store.isDuplicate("update-1"));
  assert.ok(store.isDuplicate("update-1"));
});

test("different update_ids are independent", () => {
  const store = new OffsetStore();
  store.isDuplicate("update-1");
  assert.ok(!store.isDuplicate("update-2"));
  assert.ok(!store.isDuplicate("update-3"));
});

test("count tracks the number of processed updates", () => {
  const store = new OffsetStore();
  assert.equal(store.count, 0);
  store.isDuplicate("update-1");
  assert.equal(store.count, 1);
  store.isDuplicate("update-2");
  assert.equal(store.count, 2);
  store.isDuplicate("update-1"); // duplicate, count unchanged
  assert.equal(store.count, 2);
});

test("clear resets the store", () => {
  const store = new OffsetStore();
  store.isDuplicate("update-1");
  store.isDuplicate("update-2");
  assert.equal(store.count, 2);
  store.clear();
  assert.equal(store.count, 0);
  assert.ok(!store.isDuplicate("update-1"));
});
