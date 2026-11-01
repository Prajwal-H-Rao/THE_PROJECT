/**
 * Tests for exponential backoff computation.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { computeBackoff, isRateLimited } from "./backoff.js";

describe("backoff", () => {
  it("computes exponential delay from attempt count", () => {
    const delay = computeBackoff(1, { baseMs: 1000, maxMs: 60000 });
    assert.strictEqual(delay, 1000);
  });

  it("doubles delay on each attempt", () => {
    const d1 = computeBackoff(1, { baseMs: 1000, maxMs: 60000 });
    const d2 = computeBackoff(2, { baseMs: 1000, maxMs: 60000 });
    const d3 = computeBackoff(3, { baseMs: 1000, maxMs: 60000 });
    assert.strictEqual(d1, 1000);
    assert.strictEqual(d2, 2000);
    assert.strictEqual(d3, 4000);
  });

  it("caps delay at maxMs", () => {
    const delay = computeBackoff(20, { baseMs: 1000, maxMs: 60000 });
    assert.strictEqual(delay, 60000);
  });

  it("detects rate-limited errors by 429 message", () => {
    assert.strictEqual(isRateLimited(new Error("429 Too Many Requests")), true);
    assert.strictEqual(isRateLimited(new Error("network error")), false);
    assert.strictEqual(isRateLimited(null), false);
  });
});
