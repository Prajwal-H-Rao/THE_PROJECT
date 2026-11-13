/** Tests for the scheduled poll scheduler. Deterministic: no network, no DB. */

import assert from "node:assert/strict";
import { test } from "node:test";
import { decidePoll, decideBatch, isDue, conditionalHeaders, type Source, type PollDecision } from "./scheduler.js";

const NOW = "2026-11-13T10:00:00Z";

function source(overrides: Partial<Source> = {}): Source {
  return {
    source_id: "s1",
    state: "polling",
    last_poll_at: null,
    next_check_at: null,
    interval_ms: 24 * 60 * 60 * 1000,
    etag: null,
    last_modified: null,
    ...overrides,
  };
}

test("decidePoll polls a verified source that is due", () => {
  const decision = decidePoll(source(), NOW);
  assert.equal(decision.poll, true);
  assert.equal(decision.reason, "due");
  assert.equal(decision.source_id, "s1");
});

test("decidePoll refuses a non-pollable state", () => {
  const decision = decidePoll(source({ state: "needs_verification" }), NOW);
  assert.equal(decision.poll, false);
  assert.equal(decision.reason, "not_verified_permitted");
});

test("decidePoll refuses a paused source", () => {
  const decision = decidePoll(source({ state: "paused" }), NOW);
  assert.equal(decision.poll, false);
  assert.equal(decision.reason, "not_verified_permitted");
});

test("decidePoll skips a source not yet due", () => {
  const decision = decidePoll(source({ next_check_at: "2026-11-14T10:00:00Z" }), NOW);
  assert.equal(decision.poll, false);
  assert.equal(decision.reason, "not_due");
});

test("isDue returns true when next_check_at is null", () => {
  assert.equal(isDue({ next_check_at: null } as Source, NOW), true);
});

test("isDue returns true when now >= next_check_at", () => {
  assert.equal(isDue({ next_check_at: "2026-11-13T09:00:00Z" } as Source, NOW), true);
});

test("isDue returns false when now < next_check_at", () => {
  assert.equal(isDue({ next_check_at: "2026-11-14T10:00:00Z" } as Source, NOW), false);
});

test("conditionalHeaders includes ETag and Last-Modified when present", () => {
  const headers = conditionalHeaders({
    source_id: "s1", state: "polling", last_poll_at: null, next_check_at: null,
    interval_ms: 86400000, etag: "abc123", last_modified: "Wed, 13 Nov 2026 09:00:00 GMT",
  } as Source);
  assert.equal(headers["If-None-Match"], "abc123");
  assert.equal(headers["If-Modified-Since"], "Wed, 13 Nov 2026 09:00:00 GMT");
});

test("conditionalHeaders is empty when no validators", () => {
  const headers = conditionalHeaders(source());
  assert.deepEqual(headers, {});
});

test("decideBatch applies concurrency cap", () => {
  const sources = [source({ source_id: "s1" }), source({ source_id: "s2" }), source({ source_id: "s3" })];
  const result = decideBatch(sources, NOW, 2);
  const polled = result.decisions.filter((d) => d.poll);
  assert.equal(polled.length, 2);
  const capped = result.decisions.filter((d) => d.reason === "concurrency_cap");
  assert.equal(capped.length, 1);
});

test("decideBatch does not poll non-due sources even under cap", () => {
  const sources = [
    source({ source_id: "s1", next_check_at: "2026-11-14T10:00:00Z" }),
    source({ source_id: "s2" }),
  ];
  const result = decideBatch(sources, NOW, 10);
  const polled = result.decisions.filter((d) => d.poll);
  assert.equal(polled.length, 1);
  assert.equal(polled[0]!.source_id, "s2");
});

test("decideBatch respects verified_permitted for all sources", () => {
  const sources = [
    source({ source_id: "s1", state: "polling" }),
    source({ source_id: "s2", state: "needs_verification" }),
  ];
  const result = decideBatch(sources, NOW, 10);
  const s1 = result.decisions.find((d) => d.source_id === "s1");
  const s2 = result.decisions.find((d) => d.source_id === "s2");
  assert.equal(s1!.poll, true);
  assert.equal(s2!.poll, false);
  assert.equal(s2!.reason, "not_verified_permitted");
});
