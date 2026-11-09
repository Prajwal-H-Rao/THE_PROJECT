/**
 * Nova design system - Deduplicator test (task 11.4, module 11).
 * Test-first: written before deduplicator.ts. Confirmed failing, then passing.
 * Content-addressed deduplication: same transaction content yields the same
 * idempotency key, so re-importing the same statement is a no-op.
 * Spec:826 integer minor units; Spec:741 isolated import (no pg, no creds).
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  computeContentHash,
  makeIdempotencyKey,
  isDuplicate,
  type DeduplicatorInput,
} from "./deduplicator.js";

function input(overrides: Partial<DeduplicatorInput> = {}): DeduplicatorInput {
  return {
    amountMinor: 123456,
    currency: "USD",
    transactionDate: "2026-11-05",
    merchant: "Grocery Store",
    source: "pdf-statement",
    userId: "user-1",
    ...overrides,
  };
}

describe("deduplicator", () => {
  it("computeContentHash is deterministic for the same input", () => {
    const h1 = computeContentHash(input());
    const h2 = computeContentHash(input());
    assert.strictEqual(typeof h1, "string");
    assert.ok(h1.length > 0);
    assert.strictEqual(h1, h2);
    assert.ok(/^[a-f0-9]{64}$/.test(h1), "SHA-256 hex digest");
  });

  it("different inputs produce different keys", () => {
    const base = input();
    const h1 = computeContentHash(base);
    assert.notStrictEqual(
      h1,
      computeContentHash(input({ amountMinor: 123457 })),
      "amount change changes hash",
    );
    assert.notStrictEqual(
      h1,
      computeContentHash(input({ currency: "EUR" })),
      "currency change changes hash",
    );
    assert.notStrictEqual(
      h1,
      computeContentHash(input({ merchant: "Cafe" })),
      "merchant change changes hash",
    );
    assert.notStrictEqual(
      h1,
      computeContentHash(input({ userId: "user-2" })),
      "user change changes hash",
    );
  });

  it("makeIdempotencyKey prefixes with finance:<userId>:", () => {
    const hash = computeContentHash(input());
    const key = makeIdempotencyKey("user-1", hash);
    assert.strictEqual(key, `finance:user-1:${hash}`);
    assert.notStrictEqual(makeIdempotencyKey("user-2", hash), key);
  });

  it("isDuplicate detects an existing key", () => {
    const existing = new Set(["finance:user-1:abc", "finance:user-2:def"]);
    assert.ok(isDuplicate(existing, "finance:user-1:abc"));
    assert.ok(isDuplicate(existing, "finance:user-2:def"));
    assert.ok(!isDuplicate(existing, "finance:user-1:xyz"));
    assert.ok(!isDuplicate(existing, ""));
    assert.ok(!isDuplicate(new Set(), "anything"));
  });

  it("same transaction content maps to the same idempotency key end-to-end", () => {
    const tx1 = input();
    const tx2 = input();
    assert.strictEqual(
      makeIdempotencyKey(tx1.userId, computeContentHash(tx1)),
      makeIdempotencyKey(tx2.userId, computeContentHash(tx2)),
    );
  });
});
