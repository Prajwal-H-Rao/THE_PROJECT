/**
 * Tests for ReminderMetrics: backlog gauge, delivery latency histogram,
 * delivery outcome counters, dead letter counter, and backlog alert.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { ReminderMetrics, DEFAULT_BACKLOG_THRESHOLD, checkAlert } from "./reminder-metrics.js";
import type { Reminder } from "./reminder.entity.js";

function makeReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    reminderId: "reminder-1",
    userId: "user-1",
    title: "Test reminder",
    message: null,
    dueAt: "2026-10-01T10:00:00Z",
    status: "pending",
    idempotencyKey: "key-1",
    attemptCount: 0,
    maxAttempts: 5,
    cancelledAt: null,
    cancelledReason: null,
    deadLetter: false,
    deadLetterReason: null,
    createdAt: "2026-10-01T09:00:00Z",
    updatedAt: "2026-10-01T09:00:00Z",
    ...overrides,
  };
}

describe("ReminderMetrics", () => {
  it("recordBacklog sets and reports pending gauge", () => {
    const metrics = new ReminderMetrics();
    metrics.recordBacklog(42);
    const points = metrics.getAll();
    const backlog = points.find((p) => p.name === "reminder_backlog_pending");
    assert.ok(backlog);
    assert.strictEqual(backlog!.value, 42);
  });

  it("recordBacklog overwrites previous value (gauge semantics)", () => {
    const metrics = new ReminderMetrics();
    metrics.recordBacklog(10);
    metrics.recordBacklog(3);
    const points = metrics.getAll();
    const backlog = points.find((p) => p.name === "reminder_backlog_pending");
    assert.strictEqual(backlog!.value, 3);
  });

  it("recordDeliveryLatency records created_at to delivered_at latency", () => {
    const metrics = new ReminderMetrics();
    metrics.recordDeliveryLatency("2026-10-01T09:00:00Z", "2026-10-01T09:00:05Z");
    const count = metrics
      .getAll()
      .find((p) => p.name === "reminder_latency_seconds_count");
    assert.ok(count);
    assert.strictEqual(count!.value, 1);
  });

  it("recordDeliveryLatency skips null deliveredAt", () => {
    const metrics = new ReminderMetrics();
    metrics.recordDeliveryLatency("2026-10-01T09:00:00Z", null);
    const count = metrics
      .getAll()
      .find((p) => p.name === "reminder_latency_seconds_count");
    assert.strictEqual(count, undefined);
  });

  it("recordDelivery increments counters by outcome", () => {
    const metrics = new ReminderMetrics();
    metrics.recordDelivery("delivered");
    metrics.recordDelivery("delivered");
    metrics.recordDelivery("failed");
    metrics.recordDelivery("escalated");
    const points = metrics.getAll();
    const delivered = points.find((p) => p.name === "reminder_delivered_total");
    const failed = points.find((p) => p.name === "reminder_failed_total");
    const escalated = points.find((p) => p.name === "reminder_escalated_total");
    assert.strictEqual(delivered!.value, 2);
    assert.strictEqual(failed!.value, 1);
    assert.strictEqual(escalated!.value, 1);
  });

  it("recordDeadLetter increments dead letter counter", () => {
    const metrics = new ReminderMetrics();
    metrics.recordDeadLetter();
    metrics.recordDeadLetter();
    const points = metrics.getAll();
    const deadLetter = points.find((p) => p.name === "reminder_dead_letter_total");
    assert.strictEqual(deadLetter!.value, 2);
  });

  it("checkAlert fires when backlog exceeds threshold", () => {
    const metrics = new ReminderMetrics();
    metrics.recordBacklog(DEFAULT_BACKLOG_THRESHOLD + 1);
    const result = checkAlert(metrics, DEFAULT_BACKLOG_THRESHOLD);
    assert.strictEqual(result.firing, true);
    assert.ok(result.reason);
  });

  it("checkAlert does not fire when backlog at or below threshold", () => {
    const metrics = new ReminderMetrics();
    metrics.recordBacklog(DEFAULT_BACKLOG_THRESHOLD);
    const result = checkAlert(metrics, DEFAULT_BACKLOG_THRESHOLD);
    assert.strictEqual(result.firing, false);
    assert.strictEqual(result.reason, null);
  });

  it("checkAlert does not fire when backlog is zero", () => {
    const metrics = new ReminderMetrics();
    metrics.recordBacklog(0);
    const result = checkAlert(metrics, DEFAULT_BACKLOG_THRESHOLD);
    assert.strictEqual(result.firing, false);
  });
});
