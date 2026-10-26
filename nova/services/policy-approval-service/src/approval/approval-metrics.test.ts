/** Tests for approval wait and expiry metrics (Task 15). */

import { test } from "node:test";
import assert from "node:assert/strict";
import { ApprovalMetrics } from "./approval-metrics.js";
import { formatPrometheus } from "./approval-metrics-format.js";
import type { GrantRecord } from "./grant-binding.js";

function makeRecord(overrides: Partial<GrantRecord> = {}): GrantRecord {
  const base: GrantRecord = {
    grantId: "grant-" + "a".repeat(24),
    nonce: "a".repeat(32),
    userId: "user-1",
    service: "inbox",
    action: "send",
    target: "external",
    payloadHash: "hash123",
    createdAtMs: Date.now() - 5000,
    expiresAtMs: Date.now() + 3600000,
    consumedAtMs: null,
    revokedAtMs: null,
    policyVersion: "1",
    preview: undefined,
    cardHash: undefined,
    permissions: undefined,
    consequence: undefined,
    ruleId: "inbox.send",
    ...overrides,
  };
  return base;
}

test("metrics: recordCreated increments created counter", () => {
  const m = new ApprovalMetrics();
  const record = makeRecord({ service: "inbox", action: "send" });
  m.recordCreated(record);
  const points = m.getAll();
  const created = points.find(p => p.name === "approval_grant_created_total");
  assert.ok(created);
  assert.strictEqual(created?.value, 1);
  assert.strictEqual(created?.labels.service, "inbox");
  assert.strictEqual(created?.labels.action, "send");
});

test("metrics: recordConsumed increments consumed counter and records wait time", () => {
  const m = new ApprovalMetrics();
  const record = makeRecord({ service: "inbox", action: "send", createdAtMs: 1000 });
  m.recordCreated(record);
  m.recordConsumed(record, 1500); // waited 500ms
  const points = m.getAll();
  const consumed = points.find(p => p.name === "approval_grant_consumed_total");
  assert.ok(consumed);
  assert.strictEqual(consumed?.value, 1);
  const count = points.find(p => p.name === "approval_wait_seconds_count");
  assert.ok(count);
  assert.strictEqual(count?.value, 1);
  const sum = points.find(p => p.name === "approval_wait_seconds_sum");
  assert.ok(sum);
  assert.ok(sum!.value > 0);
});

test("metrics: recordApproved increments approved counter and records wait time", () => {
  const m = new ApprovalMetrics();
  const record = makeRecord({ service: "tasks", action: "create", createdAtMs: 2000 });
  m.recordCreated(record);
  m.recordApproved(record, 3000); // waited 1000ms
  const points = m.getAll();
  const approved = points.find(p => p.name === "approval_grant_approved_total");
  assert.ok(approved);
  assert.strictEqual(approved?.value, 1);
  const count = points.find(p => p.name === "approval_wait_seconds_count" && p.labels.service === "tasks");
  assert.ok(count);
  assert.strictEqual(count?.value, 1);
});

test("metrics: recordRejected increments rejected counter", () => {
  const m = new ApprovalMetrics();
  const record = makeRecord({ service: "calendar", action: "invite" });
  m.recordCreated(record);
  m.recordRejected(record, Date.now());
  const points = m.getAll();
  const rejected = points.find(p => p.name === "approval_grant_rejected_total");
  assert.ok(rejected);
  assert.strictEqual(rejected?.value, 1);
  assert.strictEqual(rejected?.labels.service, "calendar");
});

test("metrics: recordExpired increments expired counter and stores expiry event", () => {
  const m = new ApprovalMetrics();
  const record = makeRecord({ service: "finance", action: "import", createdAtMs: 5000 });
  m.recordCreated(record);
  m.recordExpired(record, 10000); // waited 5000ms
  const points = m.getAll();
  const expired = points.find(p => p.name === "approval_grant_expired_total");
  assert.ok(expired);
  assert.strictEqual(expired?.value, 1);
  const events = m.getExpiryEvents();
  assert.strictEqual(events.length, 1);
  const firstEvent = events[0];
  assert.ok(firstEvent);
  assert.strictEqual(firstEvent.nonce, record.nonce);
  assert.strictEqual(firstEvent.waitedMs, 5000);
});

test("metrics: recordRevoked increments revoked counter", () => {
  const m = new ApprovalMetrics();
  const record = makeRecord({ service: "jobs", action: "apply" });
  m.recordCreated(record);
  m.recordRevoked(record, Date.now());
  const points = m.getAll();
  const revoked = points.find(p => p.name === "approval_grant_revoked_total");
  assert.ok(revoked);
  assert.strictEqual(revoked?.value, 1);
});

test("metrics: recordError increments errors counter", () => {
  const m = new ApprovalMetrics();
  m.recordError("invalid_nonce");
  m.recordError("invalid_nonce");
  m.recordError("unknown_nonce");
  const points = m.getAll();
  const invalid = points.find(p => p.name === "approval_errors_total" && p.labels.code === "invalid_nonce");
  const unknown = points.find(p => p.name === "approval_errors_total" && p.labels.code === "unknown_nonce");
  assert.ok(invalid);
  assert.strictEqual(invalid?.value, 2);
  assert.ok(unknown);
  assert.strictEqual(unknown?.value, 1);
});

test("metrics: histogram buckets accumulate correctly", () => {
  const m = new ApprovalMetrics();
  const record = makeRecord({ service: "inbox", action: "send", createdAtMs: 0 });
  m.recordCreated(record);
  m.recordConsumed(record, 100);    // bucket 100
  m.recordConsumed(record, 300);    // bucket 500
  m.recordConsumed(record, 1500);   // bucket 2000
  m.recordConsumed(record, 10000);  // bucket 10000
  const points = m.getAll();
  const buckets = points.filter(p => p.name === "approval_wait_seconds_bucket" && p.labels.service === "inbox");
  // Check that cumulative counts are correct
  const b100 = buckets.find(p => p.labels.le === "0.1");
  const b500 = buckets.find(p => p.labels.le === "0.5");
  const b2000 = buckets.find(p => p.labels.le === "2");
  const b10000 = buckets.find(p => p.labels.le === "10");
  assert.ok(b100);
  assert.strictEqual(b100?.value, 1);
  assert.ok(b500);
  assert.strictEqual(b500?.value, 2); // 100 and 300 both <= 500
  assert.ok(b2000);
  assert.strictEqual(b2000?.value, 3); // 100, 300, 1500 <= 2000
  assert.ok(b10000);
  assert.strictEqual(b10000?.value, 4); // all <= 10000
});

test("metrics: formatPrometheus outputs correct format", () => {
  const m = new ApprovalMetrics();
  const record = makeRecord({ service: "inbox", action: "send" });
  m.recordCreated(record);
  m.recordConsumed(record, 500);
  const output = formatPrometheus(m);
  assert.ok(output.includes("approval_grant_created_total{service=\"inbox\",action=\"send\"} 1"));
  assert.ok(output.includes("approval_grant_consumed_total{service=\"inbox\",action=\"send\"} 1"));
  assert.ok(output.includes("approval_wait_seconds_count{service=\"inbox\",action=\"send\"} 1"));
  assert.ok(output.includes("approval_wait_seconds_bucket{service=\"inbox\",action=\"send\",le=\"0.5\"} 1"));
});

test("metrics: getWaitStats returns percentiles", () => {
  const m = new ApprovalMetrics();
  const record = makeRecord({ service: "inbox", action: "send", createdAtMs: 0 });
  m.recordCreated(record);
  // Add waits: 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000
  for (let i = 1; i <= 10; i++) {
    m.recordConsumed(record, i * 100);
  }
  const stats = m.getWaitStats("inbox", "send");
  assert.ok(stats);
  assert.strictEqual(stats!.count, 10);
  assert.ok(stats!.avgMs > 0);
  assert.ok(stats!.p50Ms >= 500 && stats!.p50Ms <= 600);
  assert.ok(stats!.p95Ms >= 900 && stats!.p95Ms <= 1000);
  assert.ok(stats!.p99Ms >= 900 && stats!.p99Ms <= 1000);
});

test("metrics: getWaitStats returns null for missing data", () => {
  const m = new ApprovalMetrics();
  const stats = m.getWaitStats("unknown", "action");
  assert.strictEqual(stats, null);
});

test("metrics: reset clears all data", () => {
  const m = new ApprovalMetrics();
  const record = makeRecord({ service: "inbox", action: "send" });
  m.recordCreated(record);
  m.recordConsumed(record, 500);
  m.recordError("test");
  m.reset();
  const points = m.getAll();
  assert.strictEqual(points.length, 0);
  const events = m.getExpiryEvents();
  assert.strictEqual(events.length, 0);
});

test("metrics: expiry events limited to 1000", () => {
  const m = new ApprovalMetrics();
  for (let i = 0; i < 1100; i++) {
    const record = makeRecord({ nonce: "b".repeat(32), createdAtMs: i * 1000 });
    m.recordCreated(record);
    m.recordExpired(record, i * 1000 + 5000);
  }
  const events = m.getExpiryEvents(2000);
  assert.strictEqual(events.length, 1000);
  const firstEvent = events[0];
  assert.ok(firstEvent);
  assert.strictEqual(firstEvent.nonce, "b".repeat(32));
});