/**
 * Tests for the WhatsApp outbound sender (task 14.5).
 * Verifies rate limits and opt-in/opt-out state.
 */

import * as assert from "node:assert";
import { test } from "node:test";
import { OutboundSender } from "./outbound.js";

test("allows sending to an opted-in user within rate limits", () => {
  const sender = new OutboundSender(5, 60000);
  sender.optIn("user-1");
  assert.ok(sender.canSend("user-1"));
  assert.ok(sender.canSend("user-1"));
  assert.ok(sender.canSend("user-1"));
  assert.ok(sender.canSend("user-1"));
  assert.ok(sender.canSend("user-1"));
  assert.ok(!sender.canSend("user-1")); // 6th exceeds limit of 5
});

test("rejects sending to an opted-out user", () => {
  const sender = new OutboundSender();
  sender.optOut("user-1");
  assert.ok(!sender.canSend("user-1"));
});

test("rejects sending to a user who never opted in", () => {
  const sender = new OutboundSender();
  assert.ok(!sender.canSend("user-1"));
});

test("opt-in then opt-out blocks sending", () => {
  const sender = new OutboundSender();
  sender.optIn("user-1");
  assert.ok(sender.canSend("user-1"));
  sender.optOut("user-1");
  assert.ok(!sender.canSend("user-1"));
});

test("rate limit resets after window expires", () => {
  const sender = new OutboundSender(2, 50); // 2 messages per 50ms
  sender.optIn("user-1");
  assert.ok(sender.canSend("user-1"));
  assert.ok(sender.canSend("user-1"));
  assert.ok(!sender.canSend("user-1")); // 3rd exceeds limit
  // Manually advance window by manipulating the internal state
  // We can't wait 50ms in a unit test, so we test via the internal state
  const state = (sender as any).rateLimitMap.get("user-1");
  state.windowStart = Date.now() - 100; // Pretend window expired
  assert.ok(sender.canSend("user-1")); // Should now be allowed
});
