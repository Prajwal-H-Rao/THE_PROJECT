/** Tests for backoff, circuit breaker and rate limits. Deterministic: no randomness in assertions. */

import assert from "node:assert/strict";
import { test } from "node:test";
import { createBreaker, onSuccess, onTransientFailure, onExplicitBlock, acquireBreaker, backoffMs, checkRateLimit } from "./backoff.js";

const NOW = "2026-11-13T10:00:00Z";

test("breaker starts closed with zero failures", () => {
  const b = createBreaker(3);
  assert.equal(b.state, "closed");
  assert.equal(b.failures, 0);
});

test("success closes breaker and resets failures", () => {
  let b = createBreaker(3);
  b = onTransientFailure(b, 3, NOW);
  b = onTransientFailure(b, 3, NOW);
  b = onSuccess(b);
  assert.equal(b.state, "closed");
  assert.equal(b.failures, 0);
});

test("transient failures open breaker at threshold", () => {
  let b = createBreaker(3);
  b = onTransientFailure(b, 3, NOW);
  b = onTransientFailure(b, 3, NOW);
  assert.equal(b.state, "closed");
  b = onTransientFailure(b, 3, NOW);
  assert.equal(b.state, "open");
  assert.equal(b.failures, 3);
  assert.ok(b.nextAttemptAt !== null);
});

test("open breaker rejects acquire until nextAttemptAt", () => {
  let b = createBreaker(1);
  b = onTransientFailure(b, 1, NOW);
  assert.equal(b.state, "open");
  const acquired = acquireBreaker(b, NOW);
  assert.equal(acquired.allowed, false);
  assert.equal(acquired.breaker.state, "open");
});

test("open breaker allows half-open after nextAttemptAt", () => {
  let b = createBreaker(1);
  b = onTransientFailure(b, 1, "2026-11-13T09:00:00Z");
  const acquired = acquireBreaker(b, "2026-11-13T11:00:00Z");
  assert.equal(acquired.allowed, true);
  assert.equal(acquired.breaker.state, "half_open");
});

test("explicit block opens breaker with no retry", () => {
  const b = createBreaker(3);
  const blocked = onExplicitBlock(b, NOW);
  assert.equal(blocked.state, "open");
  assert.equal(blocked.nextAttemptAt, null);
  const acquired = acquireBreaker(blocked, NOW);
  assert.equal(acquired.allowed, false);
});

test("backoffMs grows exponentially with jitter", () => {
  const b0 = backoffMs(0);
  const b1 = backoffMs(1);
  const b2 = backoffMs(2);
  assert.ok(b0 >= 1000 && b0 <= 1200);
  assert.ok(b1 >= 2000 && b1 <= 2400);
  assert.ok(b2 >= 4000 && b2 <= 4800);
  assert.ok(b1 > b0);
  assert.ok(b2 > b1);
});

test("rate limit allows first request", () => {
  const r = { requestsPerHour: 60, minIntervalMs: 60_000, lastRequestAt: null };
  const checked = checkRateLimit(r, NOW);
  assert.equal(checked.allowed, true);
  assert.equal(checked.rate.lastRequestAt, NOW);
});

test("rate limit rejects within min interval", () => {
  const r = { requestsPerHour: 60, minIntervalMs: 60_000, lastRequestAt: "2026-11-13T09:59:00Z" };
  const checked = checkRateLimit(r, "2026-11-13T09:59:30Z");
  assert.equal(checked.allowed, false);
});

test("rate limit allows after min interval", () => {
  const r = { requestsPerHour: 60, minIntervalMs: 60_000, lastRequestAt: "2026-11-13T09:00:00Z" };
  const checked = checkRateLimit(r, "2026-11-13T10:00:00Z");
  assert.equal(checked.allowed, true);
});
