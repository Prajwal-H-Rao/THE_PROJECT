/**
 * Tests for Layer 4 authorization gate (Module 04 Task 6).
 */

import { strict as assert } from "node:assert";
import { describe, it, test } from "node:test";
import { authorize, resetQuotaForTests, CallerContext } from "./authorization.js";

const caller: CallerContext = { service: "test", scopes: [], userId: "user-1", resourceOwnerId: undefined };

function req(overrides: { actor?: string; scope?: string; action?: string; target?: string } = {}): {
  actor: string;
  scope: string;
  action: string;
  target: string;
} {
  return {
    actor: "user",
    scope: "inbox:read",
    action: "read",
    target: "own_messages",
    ...overrides,
  };
}

test("user-plane rule requires userId; absent → identity_required", () => {
  const noUser: CallerContext = { service: "test", scopes: [], userId: undefined, resourceOwnerId: undefined };
  const denial = authorize(req({ actor: "user", scope: "inbox:send" }), noUser);
  assert.strictEqual(denial.allowed, false);
  assert.strictEqual(denial.denyCode, "identity_required");
});

test("user-plane rule with userId → allowed", () => {
  const ok = authorize(req(), caller);
  assert.strictEqual(ok.allowed, true);
});
