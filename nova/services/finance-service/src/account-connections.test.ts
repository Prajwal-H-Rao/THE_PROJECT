/**
 * Nova design system - Account connections test (task 11.11, module 11).
 * Test-first: written before account-connections.ts. Confirmed failing, then passing.
 * Provider connection handling and account-linking consent inside finance service.
 * Consent scope is explicit; low confidence / missing consent forces review.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  connectAccount,
  revokeAccount,
  listConnections,
  hasConsent,
  type AccountConnection,
} from "./account-connections.js";

function connection(overrides: Partial<AccountConnection> = {}): AccountConnection {
  return {
    connectionId: "conn-1",
    userId: "user-1",
    provider: "plaid",
    providerAccountId: "acct-1",
    consentScope: "transactions.read",
    connectedAt: "2026-11-05T00:00:00Z",
    revokedAt: null,
    status: "active",
    ...overrides,
  };
}

describe("connectAccount", () => {
  it("creates an active connection with explicit consent scope", () => {
    const c = connectAccount("user-1", "plaid", "acct-1", "transactions.read");
    assert.strictEqual(c.connectionId, "conn:user-1:plaid:acct-1");
    assert.strictEqual(c.userId, "user-1");
    assert.strictEqual(c.provider, "plaid");
    assert.strictEqual(c.providerAccountId, "acct-1");
    assert.strictEqual(c.consentScope, "transactions.read");
    assert.strictEqual(c.status, "active");
    assert.ok(c.connectedAt);
    assert.strictEqual(c.revokedAt, null);
  });

  it("is idempotent: connecting same provider+account twice", () => {
    const c1 = connectAccount("user-1", "plaid", "acct-1", "transactions.read");
    const c2 = connectAccount("user-1", "plaid", "acct-1", "transactions.read");
    assert.strictEqual(c1.connectionId, c2.connectionId);
    assert.strictEqual(c1.status, "active");
  });
});

describe("revokeAccount", () => {
  it("sets revokedAt and status=revoked", () => {
    const c = connectAccount("user-1", "plaid", "acct-1", "transactions.read");
    const revoked = revokeAccount(c.connectionId)!;
    assert.strictEqual(revoked.status, "revoked");
    assert.ok(revoked.revokedAt);
  });

  it("revoking a missing connection is a no-op", () => {
    const result = revokeAccount("conn-missing");
    assert.strictEqual(result, null);
  });
});

describe("listConnections", () => {
  it("returns only active connections", () => {
    const c1 = connectAccount("user-1", "plaid", "acct-1", "transactions.read");
    const c2 = connectAccount("user-1", "plaid", "acct-2", "transactions.read");
    revokeAccount(c1.connectionId);
    const conns = listConnections("user-1");
    assert.strictEqual(conns.length, 1);
    assert.strictEqual(conns[0]!.connectionId, "conn:user-1:plaid:acct-2");
  });

  it("returns empty list for user with no connections", () => {
    const conns = listConnections("user-none");
    assert.deepStrictEqual(conns, []);
  });
});

describe("hasConsent", () => {
  it("returns true when user has active consent for the scope", () => {
    connectAccount("user-1", "plaid", "acct-1", "transactions.read");
    assert.ok(hasConsent("user-1", "plaid", "transactions.read"));
  });

  it("returns false when no active consent for the scope", () => {
    connectAccount("user-1", "plaid", "acct-1", "transactions.read");
    assert.ok(!hasConsent("user-1", "plaid", "transactions.write"));
    assert.ok(!hasConsent("user-1", "oauth", "transactions.read"));
  });

  it("returns false for a revoked connection", () => {
    const c = connectAccount("user-1", "oauth", "acct-1", "transactions.read");
    revokeAccount(c.connectionId);
    assert.ok(!hasConsent("user-1", "oauth", "transactions.read"));
  });
});
