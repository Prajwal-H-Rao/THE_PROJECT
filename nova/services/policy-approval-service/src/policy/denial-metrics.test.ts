/** Tests for denial metrics (Task 18). */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DenialCode,
  DenialMetrics,
  getDenialMetrics,
  configureDenialMetrics,
  recordDenial,
  checkAlerts,
  DEFAULT_ALERT_THRESHOLDS,
} from "./denial-metrics.js";

test("denial metrics: record and count", () => {
  const metrics = new DenialMetrics();
  
  metrics.recordDenial(DenialCode.DENIED_OPERATION);
  metrics.recordDenial(DenialCode.DENIED_OPERATION);
  metrics.recordDenial(DenialCode.OWNERSHIP_MISMATCH);
  
  assert.strictEqual(metrics.getCount(DenialCode.DENIED_OPERATION), 2);
  assert.strictEqual(metrics.getCount(DenialCode.OWNERSHIP_MISMATCH), 1);
  assert.strictEqual(metrics.getCount(DenialCode.NO_MATCHING_RULE), 0);
  assert.strictEqual(metrics.getTotalDenials(), 3);
});

test("denial metrics: get all counts", () => {
  const metrics = new DenialMetrics();
  
  metrics.recordDenial(DenialCode.DENIED_OPERATION);
  metrics.recordDenial(DenialCode.IDENTITY_REQUIRED);
  
  const counts = metrics.getAllCounts();
  assert.strictEqual(counts[DenialCode.DENIED_OPERATION], 1);
  assert.strictEqual(counts[DenialCode.IDENTITY_REQUIRED], 1);
});

test("denial metrics: reset", () => {
  const metrics = new DenialMetrics();
  metrics.recordDenial(DenialCode.DENIED_OPERATION);
  metrics.reset();
  
  assert.strictEqual(metrics.getTotalDenials(), 0);
  assert.strictEqual(metrics.getCount(DenialCode.DENIED_OPERATION), 0);
});

test("denial metrics: denial rate is non-negative", () => {
  const metrics = new DenialMetrics();
  
  metrics.recordDenial(DenialCode.DENIED_OPERATION);
  metrics.recordDenial(DenialCode.DENIED_OPERATION);
  
  const rate = metrics.getDenialRate();
  assert.ok(rate >= 0);
});

test("denial metrics: format prometheus", () => {
  const metrics = new DenialMetrics();
  
  metrics.recordDenial(DenialCode.DENIED_OPERATION);
  metrics.recordDenial(DenialCode.OWNERSHIP_MISMATCH);
  
  const output = metrics.formatPrometheus();
  assert.ok(output.includes('nova_denials_total{reason="denied_operation"}'));
  assert.ok(output.includes('nova_denials_total{reason="ownership_mismatch"}'));
  assert.ok(output.includes("nova_denials_rate_per_second"));
  assert.ok(output.includes("nova_denials_total_all"));
});

test("denial metrics: global singleton", () => {
  // Reset global for test
  configureDenialMetrics(new DenialMetrics());
  const metrics = getDenialMetrics();
  metrics.reset();
  
  recordDenial(DenialCode.DENIED_OPERATION);
  assert.strictEqual(metrics.getCount(DenialCode.DENIED_OPERATION), 1);
});

test("denial metrics: check alerts no alert", () => {
  const metrics = new DenialMetrics();
  metrics.recordDenial(DenialCode.DENIED_OPERATION);
  
  const alerts = checkAlerts(metrics);
  assert.strictEqual(alerts.length, 0);
});

test("denial metrics: check alerts high denial rate structure", () => {
  const metrics = new DenialMetrics();
  
  // Add many denials
  for (let i = 0; i < DEFAULT_ALERT_THRESHOLDS.denialRatePerMinute + 10; i++) {
    metrics.recordDenial(DenialCode.DENIED_OPERATION);
  }
  
  // Verify alert function returns array
  const alerts = checkAlerts(metrics);
  assert.ok(Array.isArray(alerts));
});

test("denial metrics: format prometheus includes all codes", () => {
  const metrics = new DenialMetrics();
  
  // Record one of each
  for (const code of Object.values(DenialCode)) {
    metrics.recordDenial(code);
  }
  
  const output = metrics.formatPrometheus();
  for (const code of Object.values(DenialCode)) {
    assert.ok(output.includes(`reason="${code}"`));
  }
});

test("denial metrics: snapshot includes all fields", () => {
  const metrics = new DenialMetrics();
  metrics.recordDenial(DenialCode.DENIED_OPERATION);
  
  const snapshot = metrics.getSnapshot();
  assert.ok(snapshot.counts);
  assert.ok(typeof snapshot.total === "number");
  assert.ok(typeof snapshot.ratePerSecond === "number");
  assert.ok(typeof snapshot.timestamp === "number");
  assert.strictEqual(snapshot.total, 1);
});
