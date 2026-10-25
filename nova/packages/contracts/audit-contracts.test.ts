/** Tests for the audit contracts. */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AuditRecordInput,
  AuditRecord,
  AuditRecordResponse,
  AuditRecordError,
  AuditQuery,
  ActorType,
  PolicyResult,
  ExecutionStatus,
  VerificationType,
} from "./audit-contracts.js";

test("audit-contracts: AuditRecordInput accepts valid input", () => {
  const input: AuditRecordInput = {
    actorType: "user",
    actorId: "8f2dc4e0-3f2a-4b8e-9d11-5a9b7c2e6f01",
    action: "inbox.send",
    resourceType: "message",
    resourceId: "msg-123",
    policyResult: "allowed",
    policyVersion: "1",
    correlationId: "corr-abc123",
    executionStatus: "succeeded",
    verificationType: "signature",
    evidenceRef: "obj://bucket/key",
    payload: { to: "x@example.com" },
  };
  assert.strictEqual(input.actorType, "user");
  assert.strictEqual(input.policyResult, "allowed");
  assert.strictEqual(input.policyVersion, "1");
});

test("audit-contracts: AuditRecordInput accepts minimal input", () => {
  const input: AuditRecordInput = {
    actorType: "service",
    actorId: "policy-service",
    action: "policy.decide",
    resourceType: "policy",
    policyResult: "denied",
    policyVersion: 2,
    correlationId: "corr-def456",
  };
  assert.strictEqual(input.actorType, "service");
  assert.strictEqual(input.policyResult, "denied");
  assert.strictEqual(input.policyVersion, 2);
  assert.strictEqual(input.executionStatus, undefined);
  assert.strictEqual(input.verificationType, undefined);
});

test("audit-contracts: ActorType enum values", () => {
  const types: ActorType[] = ["user", "service", "system"];
  for (const t of types) {
    const input: AuditRecordInput = {
      actorType: t,
      actorId: "test",
      action: "test",
      resourceType: "test",
      policyResult: "allowed",
      policyVersion: "1",
      correlationId: "corr",
    };
    assert.strictEqual(input.actorType, t);
  }
});

test("audit-contracts: PolicyResult enum values", () => {
  const results: PolicyResult[] = ["allowed", "denied", "step_up", "error"];
  for (const r of results) {
    const input: AuditRecordInput = {
      actorType: "user",
      actorId: "test",
      action: "test",
      resourceType: "test",
      policyResult: r,
      policyVersion: "1",
      correlationId: "corr",
    };
    assert.strictEqual(input.policyResult, r);
  }
});

test("audit-contracts: AuditRecordResponse shape", () => {
  const response: AuditRecordResponse = {
    ok: true,
    auditId: "abc-123",
    rowHash: "deadbeef",
  };
  assert.strictEqual(response.ok, true);
  assert.strictEqual(response.auditId, "abc-123");
  assert.strictEqual(response.rowHash, "deadbeef");
});

test("audit-contracts: AuditRecordError shape", () => {
  const error: AuditRecordError = {
    ok: false,
    error: "invalid_input",
    message: "Missing required field",
  };
  assert.strictEqual(error.ok, false);
  assert.strictEqual(error.error, "invalid_input");
});

test("audit-contracts: AuditQuery shape", () => {
  const query: AuditQuery = {
    actorType: "user",
    actorId: "user-123",
    action: "inbox.send",
    resourceType: "message",
    resourceId: "msg-1",
    policyResult: "allowed",
    from: "2026-01-01T00:00:00Z",
    to: "2026-12-31T23:59:59Z",
    limit: 100,
    offset: 0,
  };
  assert.strictEqual(query.actorType, "user");
  assert.strictEqual(query.limit, 100);
  assert.strictEqual(query.offset, 0);
});

test("audit-contracts: ExecutionStatus enum values", () => {
  const statuses: ExecutionStatus[] = ["pending", "succeeded", "failed", "compensated"];
  for (const s of statuses) {
    const input: AuditRecordInput = {
      actorType: "user",
      actorId: "test",
      action: "test",
      resourceType: "test",
      policyResult: "allowed",
      policyVersion: "1",
      correlationId: "corr",
      executionStatus: s,
    };
    assert.strictEqual(input.executionStatus, s);
  }
});

test("audit-contracts: VerificationType enum values", () => {
  const types: VerificationType[] = ["none", "signature", "receipt", "external", "human"];
  for (const v of types) {
    const input: AuditRecordInput = {
      actorType: "user",
      actorId: "test",
      action: "test",
      resourceType: "test",
      policyResult: "allowed",
      policyVersion: "1",
      correlationId: "corr",
      verificationType: v,
    };
    assert.strictEqual(input.verificationType, v);
  }
});