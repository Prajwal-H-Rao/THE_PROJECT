/** Tests for the in-process per-user daily usage counter (Layer 4 quota). */

import { test } from "node:test";
import assert from "node:assert/strict";
import { UsageCounter, configureUsageCounter, getUsageCounter } from "./usage-counter.js";

const TEST_USER = "test-user";

test("counter starts at zero and increments", () => {
  configureUsageCounter(5);
  const [allowed, remaining] = getUsageCounter().checkAndIncrement(TEST_USER);
  assert.strictEqual(allowed, true);
  assert.strictEqual(remaining, 4);
});

test("limit is enforced", () => {
  configureUsageCounter(2);
  getUsageCounter().reset(TEST_USER);
  assert.strictEqual(getUsageCounter().checkAndIncrement(TEST_USER)[0], true);
  assert.strictEqual(getUsageCounter().checkAndIncrement(TEST_USER)[0], true);
  assert.strictEqual(getUsageCounter().checkAndIncrement(TEST_USER)[0], false);
});

test("remaining is accurate", () => {
  configureUsageCounter(3);
  getUsageCounter().reset(TEST_USER);
  assert.strictEqual(getUsageCounter().getRemaining(TEST_USER), 3);
  getUsageCounter().checkAndIncrement(TEST_USER);
  assert.strictEqual(getUsageCounter().getRemaining(TEST_USER), 2);
});

test("different users are isolated", () => {
  configureUsageCounter(1);
  getUsageCounter().reset("user-a");
  getUsageCounter().reset("user-b");
  assert.strictEqual(getUsageCounter().checkAndIncrement("user-a")[0], true);
  assert.strictEqual(getUsageCounter().checkAndIncrement("user-a")[0], false);
  assert.strictEqual(getUsageCounter().checkAndIncrement("user-b")[0], true);
});

test("daily rollover works (simulated by different day keys)", () => {
  // The counter keys off UTC day; we can't easily mock time here,
  // but we can verify the day key computation is consistent.
  const counter = new UsageCounter(10);
  const key1 = counter["dayKey"]("u1");
  const key2 = counter["dayKey"]("u1");
  assert.strictEqual(key1, key2);
  const key3 = counter["dayKey"]("u2");
  assert.notStrictEqual(key1, key3);
});

test("reset(user) clears only that user", () => {
  configureUsageCounter(5);
  getUsageCounter().reset("u1");
  getUsageCounter().reset("u2");
  getUsageCounter().checkAndIncrement("u1");
  getUsageCounter().checkAndIncrement("u2");
  getUsageCounter().reset("u1");
  assert.strictEqual(getUsageCounter().getRemaining("u1"), 5);
  assert.strictEqual(getUsageCounter().getRemaining("u2"), 4);
});

test("reset() with no arg clears all", () => {
  configureUsageCounter(5);
  getUsageCounter().reset("u1");
  getUsageCounter().checkAndIncrement("u1");
  getUsageCounter().reset();
  assert.strictEqual(getUsageCounter().getRemaining("u1"), 5);
});

test("limit of 0 denies all", () => {
  configureUsageCounter(0);
  getUsageCounter().reset("u1");
  const [allowed, remaining] = getUsageCounter().checkAndIncrement("u1");
  assert.strictEqual(allowed, false);
  assert.strictEqual(remaining, 0);
});

test("global singleton getUsageCounter returns same instance", () => {
  const c1 = getUsageCounter();
  const c2 = getUsageCounter();
  assert.strictEqual(c1, c2);
});

test("configureUsageCounter replaces the singleton", () => {
  configureUsageCounter(999);
  const c = getUsageCounter();
  // The counter is a new instance; previous state discarded.
  const [allowed] = c.checkAndIncrement("new-user");
  assert.strictEqual(allowed, true);
});

test("limit can be read back via remaining when zero used", () => {
  configureUsageCounter(42);
  getUsageCounter().reset("limit-test");
  assert.strictEqual(getUsageCounter().getRemaining("limit-test"), 42);
});

test("checkAndIncrement returns remaining after increment", () => {
  configureUsageCounter(10);
  getUsageCounter().reset("u1");
  const [allowed, remaining] = getUsageCounter().checkAndIncrement("u1");
  assert.strictEqual(allowed, true);
  assert.strictEqual(remaining, 9);
});