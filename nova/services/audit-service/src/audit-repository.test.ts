/** Tests for the audit service (Task 12). */

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { InMemoryAuditRepository } from "./audit-repository.js";
import {
  AuditRecordInput,
  AuditRecord,
  AuditQuery,
  PolicyResult,
  ActorType,
} from "@nova/contracts/audit-contracts";

test("audit: record an allowed decision", async () => {
  const repo = new InMemoryAuditRepository();
  const input: AuditRecordInput = {
    actorType: "user",
    actorId: "user-123",
    action: "send_message",
    resourceType: "message",
    resourceId: "msg-456",
    policyResult: "allowed",
    policyVersion: 1,
    correlationId: "corr-789",
    payload: { content: "hello" },
  };

  const response = await repo.record(input);

  assert.strictEqual(response.ok, true);
  assert.ok(response.auditId);
  assert.ok(response.rowHash);
  assert.strictEqual(typeof response.auditId, "string");
  assert.strictEqual(typeof response.rowHash, "string");
  assert.strictEqual(response.rowHash.length, 64); // SHA-256 hex
});

test("audit: record a denied decision", async () => {
  const repo = new InMemoryAuditRepository();
  const input: AuditRecordInput = {
    actorType: "user",
    actorId: "user-123",
    action: "delete_account",
    resourceType: "account",
    resourceId: "acc-456",
    policyResult: "denied",
    policyVersion: 1,
    correlationId: "corr-789",
    payload: { reason: "not_authorized" },
  };

  const response = await repo.record(input);

  assert.strictEqual(response.ok, true);
  assert.ok(response.auditId);
  assert.ok(response.rowHash);
});

test("audit: both allowed and denied outcomes are recorded", async () => {
  const repo = new InMemoryAuditRepository();

  // Record allowed
  await repo.record({
    actorType: "user",
    actorId: "user-1",
    action: "create",
    resourceType: "document",
    policyResult: "allowed",
    policyVersion: 1,
    correlationId: "corr-1",
  });

  // Record denied
  await repo.record({
    actorType: "user",
    actorId: "user-1",
    action: "delete",
    resourceType: "document",
    policyResult: "denied",
    policyVersion: 1,
    correlationId: "corr-2",
  });

  const allRecords = await repo.find({});
  assert.strictEqual(allRecords.length, 2);

  const allowed = allRecords.find((r) => r.policyResult === "allowed");
  const denied = allRecords.find((r) => r.policyResult === "denied");

  assert.ok(allowed);
  assert.strictEqual(allowed?.policyResult, "allowed");
  assert.strictEqual(allowed?.action, "create");

  assert.ok(denied);
  assert.strictEqual(denied?.policyResult, "denied");
  assert.strictEqual(denied?.action, "delete");
});

test("audit: hash chain links records sequentially", async () => {
  const repo = new InMemoryAuditRepository();

  const r1 = await repo.record({
    actorType: "user",
    actorId: "user-1",
    action: "action1",
    resourceType: "resource",
    policyResult: "allowed",
    policyVersion: 1,
    correlationId: "corr-1",
  });

  const r2 = await repo.record({
    actorType: "user",
    actorId: "user-1",
    action: "action2",
    resourceType: "resource",
    policyResult: "denied",
    policyVersion: 1,
    correlationId: "corr-2",
  });

  const allRecords = await repo.find({});

  // Records are sorted by occurredAt descending, so r2 (newer) comes first, r1 (older) second
  // The hash chain: r1 has previousHash="" (first in chain)
  // r2 has previousHash=r1.rowHash
  // Since r2 is first in results (newer), its previousHash should be r1.rowHash
  const newerRecord = allRecords.find((r) => r.auditId === r2.auditId);
  const olderRecord = allRecords.find((r) => r.auditId === r1.auditId);

  assert.ok(newerRecord);
  assert.ok(olderRecord);
  assert.strictEqual(newerRecord.previousHash, r1.rowHash);
  assert.ok(olderRecord.previousHash === "" || olderRecord.previousHash === undefined);
});

test("audit: query by actorId", async () => {
  const repo = new InMemoryAuditRepository();

  await repo.record({
    actorType: "user",
    actorId: "user-1",
    action: "read",
    resourceType: "file",
    policyResult: "allowed",
    policyVersion: 1,
    correlationId: "corr-1",
  });

  await repo.record({
    actorType: "user",
    actorId: "user-2",
    action: "read",
    resourceType: "file",
    policyResult: "allowed",
    policyVersion: 1,
    correlationId: "corr-2",
  });

  const results = await repo.find({ actorId: "user-1" });
  assert.strictEqual(results.length, 1);
  const firstResult = results[0];
  assert.ok(firstResult);
  assert.strictEqual(firstResult.actorId, "user-1");
});

test("audit: query by action", async () => {
  const repo = new InMemoryAuditRepository();

  await repo.record({
    actorType: "user",
    actorId: "user-1",
    action: "send",
    resourceType: "message",
    policyResult: "allowed",
    policyVersion: 1,
    correlationId: "corr-1",
  });

  await repo.record({
    actorType: "user",
    actorId: "user-1",
    action: "delete",
    resourceType: "message",
    policyResult: "denied",
    policyVersion: 1,
    correlationId: "corr-2",
  });

  const results = await repo.find({ action: "send" });
  assert.strictEqual(results.length, 1);
  const firstResult = results[0];
  assert.ok(firstResult);
  assert.strictEqual(firstResult.action, "send");
});

test("audit: query by policyResult", async () => {
  const repo = new InMemoryAuditRepository();

  await repo.record({
    actorType: "user",
    actorId: "user-1",
    action: "action1",
    resourceType: "resource",
    policyResult: "allowed",
    policyVersion: 1,
    correlationId: "corr-1",
  });

  await repo.record({
    actorType: "user",
    actorId: "user-1",
    action: "action2",
    resourceType: "resource",
    policyResult: "denied",
    policyVersion: 1,
    correlationId: "corr-2",
  });

  await repo.record({
    actorType: "user",
    actorId: "user-1",
    action: "action3",
    resourceType: "resource",
    policyResult: "allowed",
    policyVersion: 1,
    correlationId: "corr-3",
  });

  const allowed = await repo.find({ policyResult: "allowed" });
  const denied = await repo.find({ policyResult: "denied" });

  assert.strictEqual(allowed.length, 2);
  assert.strictEqual(denied.length, 1);
  for (const r of allowed) {
    assert.strictEqual(r.policyResult, "allowed");
  }
  for (const r of denied) {
    assert.strictEqual(r.policyResult, "denied");
  }
});

test("audit: query by time range", async () => {
  const repo = new InMemoryAuditRepository();

  const now = new Date();
  const beforeTime = new Date(now.getTime() - 1000).toISOString();
  const afterTime = new Date(now.getTime() + 1000).toISOString();

  // Record with explicit timestamps is not possible with current API
  // So we test the query mechanism with actual timestamps
  await repo.record({
    actorType: "user",
    actorId: "user-1",
    action: "action1",
    resourceType: "resource",
    policyResult: "allowed",
    policyVersion: 1,
    correlationId: "corr-1",
  });

  await new Promise((r) => setTimeout(r, 10));

  const midTime = new Date().toISOString();

  await repo.record({
    actorType: "user",
    actorId: "user-1",
    action: "action2",
    resourceType: "resource",
    policyResult: "denied",
    policyVersion: 1,
    correlationId: "corr-2",
  });

  await new Promise((r) => setTimeout(r, 10));

  await repo.record({
    actorType: "user",
    actorId: "user-1",
    action: "action3",
    resourceType: "resource",
    policyResult: "allowed",
    policyVersion: 1,
    correlationId: "corr-3",
  });

  // Query with from=midTime should return action2 and action3 (occurred after midTime)
  // Since results are sorted descending, action3 is first
  const fromMid = await repo.find({ from: midTime });
  assert.ok(fromMid.length >= 1);
  const fromMidFirst = fromMid[0];
  assert.ok(fromMidFirst);
  // The first result should be action3 (most recent)
  assert.strictEqual(fromMidFirst.action, "action3");

  // Query with to=midTime should return action1 (occurred before midTime)
  const toMid = await repo.find({ to: midTime });
  assert.ok(toMid.length >= 1);
  const toMidFirst = toMid[0];
  assert.ok(toMidFirst);
  // The first result should be action1 or action2 depending on timing
  // But action1 definitely occurred before midTime
  const foundAction1 = toMid.some((r) => r.action === "action1");
  assert.ok(foundAction1);
});

test("audit: pagination with limit and offset", async () => {
  const repo = new InMemoryAuditRepository();

  for (let i = 0; i < 5; i++) {
    await repo.record({
      actorType: "user",
      actorId: `user-${i}`,
      action: "action",
      resourceType: "resource",
      policyResult: "allowed",
      policyVersion: 1,
      correlationId: `corr-${i}`,
    });
  }

  const page1 = await repo.find({ limit: 2, offset: 0 });
  const page2 = await repo.find({ limit: 2, offset: 2 });
  const page3 = await repo.find({ limit: 2, offset: 4 });

  assert.strictEqual(page1.length, 2);
  assert.strictEqual(page2.length, 2);
  assert.strictEqual(page3.length, 1);
});

test("audit: results sorted by occurredAt descending", async () => {
  const repo = new InMemoryAuditRepository();

  await repo.record({
    actorType: "user",
    actorId: "user-1",
    action: "first",
    resourceType: "resource",
    policyResult: "allowed",
    policyVersion: 1,
    correlationId: "corr-1",
  });

  await new Promise((r) => setTimeout(r, 10));

  await repo.record({
    actorType: "user",
    actorId: "user-1",
    action: "second",
    resourceType: "resource",
    policyResult: "allowed",
    policyVersion: 1,
    correlationId: "corr-2",
  });

  await new Promise((r) => setTimeout(r, 10));

  await repo.record({
    actorType: "user",
    actorId: "user-1",
    action: "third",
    resourceType: "resource",
    policyResult: "allowed",
    policyVersion: 1,
    correlationId: "corr-3",
  });

  const results = await repo.find({});

  const first = results[0];
  const second = results[1];
  const third = results[2];
  assert.ok(first);
  assert.ok(second);
  assert.ok(third);
  assert.strictEqual(first.action, "third");
  assert.strictEqual(second.action, "second");
  assert.strictEqual(third.action, "first");
});

test("audit: record with optional fields", async () => {
  const repo = new InMemoryAuditRepository();

  const input: AuditRecordInput = {
    actorType: "service",
    actorId: "svc-123",
    action: "process_payment",
    resourceType: "payment",
    resourceId: "pay-456",
    policyResult: "step_up",
    policyVersion: 2,
    correlationId: "corr-999",
    executionStatus: "pending",
    verificationType: "receipt",
    evidenceRef: "ext-ref-123",
    payload: { amount: 100, currency: "USD" },
  };

  const response = await repo.record(input);

  assert.strictEqual(response.ok, true);
  const records = await repo.find({});
  assert.strictEqual(records.length, 1);
  const record = records[0];
  assert.ok(record);
  assert.strictEqual(record.executionStatus, "pending");
  assert.strictEqual(record.verificationType, "receipt");
  assert.strictEqual(record.evidenceRef, "ext-ref-123");
  assert.deepEqual(record.payload, { amount: 100, currency: "USD" });
});

test("audit: defaults for optional fields", async () => {
  const repo = new InMemoryAuditRepository();

  await repo.record({
    actorType: "user",
    actorId: "user-1",
    action: "action",
    resourceType: "resource",
    policyResult: "allowed",
    policyVersion: 1,
    correlationId: "corr-1",
  });

  const records = await repo.find({});
  assert.strictEqual(records.length, 1);
  const record = records[0];
  assert.ok(record);
  assert.strictEqual(record.executionStatus, "succeeded");
  assert.strictEqual(record.verificationType, "none");
  assert.ok(record.evidenceRef === undefined || record.evidenceRef === "");
  assert.deepEqual(record.payload, {});
});