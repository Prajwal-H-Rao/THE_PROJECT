/**
 * Tests for the WhatsApp replay guard (task 14.4).
 * Verifies timestamp window checking: recent messages accepted,
 * old messages rejected.
 */

import * as assert from "node:assert";
import { test } from "node:test";
import { ReplayGuard } from "./replay.js";

test("accepts a recent timestamp within the window", () => {
  const guard = new ReplayGuard(5 * 60 * 1000); // 5 minutes
  const now = Date.now();
  assert.ok(guard.isWithinWindow(now));
  assert.ok(guard.isWithinWindow(now - 60000)); // 1 minute ago
  assert.ok(guard.isWithinWindow(now - 299999)); // ~5 minutes ago
});

test("rejects a timestamp outside the window", () => {
  const guard = new ReplayGuard(5 * 60 * 1000); // 5 minutes
  const now = Date.now();
  assert.ok(!guard.isWithinWindow(now - 300001)); // ~5 minutes + 1ms ago
  assert.ok(!guard.isWithinWindow(now - 3600000)); // 1 hour ago
});

test("rejects a future timestamp", () => {
  const guard = new ReplayGuard(5 * 60 * 1000);
  const now = Date.now();
  assert.ok(!guard.isWithinWindow(now + 60000)); // 1 minute in the future
});

test("nonces are tracked and reused nonces rejected", () => {
  const guard = new ReplayGuard();
  assert.ok(!guard.isNonceReused("nonce-1"));
  assert.ok(guard.isNonceReused("nonce-1")); // reused
  assert.ok(guard.isNonceReused("nonce-1")); // reused again
});

test("different nonces are independent", () => {
  const guard = new ReplayGuard();
  assert.ok(!guard.isNonceReused("nonce-1"));
  assert.ok(!guard.isNonceReused("nonce-2"));
});

test("count tracks the number of tracked nonces", () => {
  const guard = new ReplayGuard();
  assert.equal(guard.count, 0);
  guard.isNonceReused("nonce-1");
  assert.equal(guard.count, 1);
  guard.isNonceReused("nonce-2");
  assert.equal(guard.count, 2);
  guard.isNonceReused("nonce-1"); // reused, count unchanged
  assert.equal(guard.count, 2);
});

test("clear resets the store", () => {
  const guard = new ReplayGuard();
  guard.isNonceReused("nonce-1");
  guard.isNonceReused("nonce-2");
  assert.equal(guard.count, 2);
  guard.clear();
  assert.equal(guard.count, 0);
  assert.ok(!guard.isNonceReused("nonce-1"));
});
