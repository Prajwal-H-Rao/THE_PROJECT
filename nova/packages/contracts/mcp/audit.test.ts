/** Tests for the MCP audit event contract. */

import assert from "node:assert/strict";
import test from "node:test";

import {
  MCPAuditEvent,
  MCPAuditEventType,
  validate_mcp_audit_event,
} from "./audit.js";

const baseEvent = {
  event_id: "550e8400-e29b-41d4-a716-446655440000",
  occurred_at: "2026-10-26T10:00:00.000Z",
  event_type: "mcp.call.allowed",
  producer: "mcp-calendar-server",
  actor_type: "user",
  actor_id: "user-123",
  action: "calendar.create_event",
  resource_type: "calendar",
  policy_result: "allowed",
  policy_version: 5,
  execution_status: "succeeded",
  verification_type: "receipt",
  payload: { tool: "calendar.create_event", args_count: 2 },
};

test("valid MCP audit event passes validation", () => {
  const event = {
    ...baseEvent,
    correlation_id: "corr-123",
    causation_id: "cause-456",
    resource_id: "cal-456",
    evidence_ref: "receipt-789",
  };

  const validated = validate_mcp_audit_event(event);
  assert.equal(validated.event_type, "mcp.call.allowed");
  assert.equal(validated.producer, "mcp-calendar-server");
  assert.equal(validated.actor_id, "user-123");
  assert.equal(validated.policy_result, "allowed");
  assert.equal(validated.policy_version, 5);
});

test("audit event rejects payload with secret keys", () => {
  const event = {
    ...baseEvent,
    payload: { secret: "abc123" },
  };

  assert.throws(() => validate_mcp_audit_event(event), /forbidden key/);
});

test("audit event rejects password in payload", () => {
  const event = {
    ...baseEvent,
    event_type: "mcp.call.denied",
    actor_type: "service",
    actor_id: "svc-1",
    action: "test.action",
    resource_type: "test",
    policy_result: "denied",
    policy_version: 1,
    execution_status: "failed",
    payload: { password: "secret" },
  };

  assert.throws(() => validate_mcp_audit_event(event), /forbidden key/);
});

test("audit event accepts safe payload", () => {
  const event = {
    ...baseEvent,
    event_type: "mcp.call.executed",
    actor_type: "system",
    actor_id: "sys-1",
    action: "test.action",
    resource_type: "test",
    policy_version: 1,
    payload: { tool: "test.action", duration_ms: 42 },
  };

  const validated = validate_mcp_audit_event(event);
  assert.equal(validated.execution_status, "succeeded");
});

test("all audit event types are valid strings", () => {
  const types = [
    "mcp.call.allowed",
    "mcp.call.denied",
    "mcp.call.executed",
    "mcp.call.failed",
    "mcp.approval.granted",
    "mcp.approval.revoked",
    "mcp.approval.expired",
  ];
  assert.ok(types.includes("mcp.call.allowed"));
  assert.ok(types.includes("mcp.call.denied"));
  assert.ok(types.includes("mcp.call.executed"));
  assert.ok(types.includes("mcp.call.failed"));
  assert.ok(types.includes("mcp.approval.granted"));
  assert.ok(types.includes("mcp.approval.revoked"));
  assert.ok(types.includes("mcp.approval.expired"));
});

test("audit event requires required fields", () => {
  const event = { ...baseEvent } as Record<string, unknown>;
  delete event.producer;
  assert.throws(() => validate_mcp_audit_event(event), /producer is required/);
});

test("audit event default schema_version is 1", () => {
  const event = { ...baseEvent } as Record<string, unknown>;
  delete event.schema_version;
  const validated = validate_mcp_audit_event(event);
  assert.equal(validated.schema_version, 1);
});

test("audit event accepts all valid policy_result values", () => {
  for (const result of ["allowed", "denied", "step_up", "error"]) {
    const event = {
      ...baseEvent,
      event_type: "mcp.call.executed",
      policy_result: result,
      policy_version: 1,
    };

    const validated = validate_mcp_audit_event(event);
    assert.equal(validated.policy_result, result);
  }
});

test("audit event accepts all valid execution_status values", () => {
  for (const status of ["pending", "succeeded", "failed", "compensated"]) {
    const event = {
      ...baseEvent,
      event_type: "mcp.call.executed",
      policy_result: "allowed",
      policy_version: 1,
      execution_status: status,
    };

    const validated = validate_mcp_audit_event(event);
    assert.equal(validated.execution_status, status);
  }
});

test("audit event rejects unknown policy_result", () => {
  const event = {
    ...baseEvent,
    event_type: "mcp.call.executed",
    policy_result: "invalid",
    policy_version: 1,
  };

  assert.throws(() => validate_mcp_audit_event(event), /policy_result/);
});

// New tests for added validation
test("audit event missing event_id rejected", () => {
  const event = { ...baseEvent } as Record<string, unknown>;
  delete event.event_id;
  assert.throws(() => validate_mcp_audit_event(event), /event_id is required/);
});

test("audit event invalid event_id rejected", () => {
  const event = { ...baseEvent, event_id: "not-a-uuid" };
  assert.throws(() => validate_mcp_audit_event(event), /event_id must be a valid UUID/);
});

test("audit event missing occurred_at rejected", () => {
  const event = { ...baseEvent } as Record<string, unknown>;
  delete event.occurred_at;
  assert.throws(() => validate_mcp_audit_event(event), /occurred_at is required/);
});

test("audit event invalid occurred_at rejected", () => {
  const event = { ...baseEvent, occurred_at: "not-a-date" };
  assert.throws(() => validate_mcp_audit_event(event), /occurred_at must be a valid ISO 8601 timestamp/);
});

test("audit event invalid event_type rejected", () => {
  const event = { ...baseEvent, event_type: "invalid.event.type" };
  assert.throws(() => validate_mcp_audit_event(event), /Invalid event_type/);
});

test("audit event invalid actor_type rejected", () => {
  const event = { ...baseEvent, actor_type: "invalid" };
  assert.throws(() => validate_mcp_audit_event(event), /actor_type must be 'user', 'service', or 'system'/);
});

test("audit event invalid policy_version rejected", () => {
  const event = { ...baseEvent, policy_version: 0 };
  assert.throws(() => validate_mcp_audit_event(event), /policy_version must be a positive integer/);
});

test("audit event invalid execution_status rejected", () => {
  const event = { ...baseEvent, execution_status: "invalid" };
  assert.throws(() => validate_mcp_audit_event(event), /execution_status must be/);
});

test("audit event invalid verification_type rejected", () => {
  const event = { ...baseEvent, verification_type: "invalid" };
  assert.throws(() => validate_mcp_audit_event(event), /verification_type must be/);
});

test("audit event rejects nested secret keys", () => {
  const event = {
    ...baseEvent,
    payload: { nested: { secret: "value" } },
  };
  assert.throws(() => validate_mcp_audit_event(event), /forbidden key/);
});

test("audit event rejects secret in array", () => {
  const event = {
    ...baseEvent,
    payload: { items: [{ token: "abc" }] },
  };
  assert.throws(() => validate_mcp_audit_event(event), /forbidden key/);
});

test("audit event allows password_hash (not exact match)", () => {
  const event = {
    ...baseEvent,
    payload: { password_hash: "hashed_value" },
  };
  // Should NOT throw - exact key match only
  const validated = validate_mcp_audit_event(event);
  assert.ok(validated);
});

test("audit event allows access_token_expiry (not exact match)", () => {
  const event = {
    ...baseEvent,
    payload: { access_token_expiry: "2026-10-26T10:00:00.000Z" },
  };
  // Should NOT throw - exact key match only
  const validated = validate_mcp_audit_event(event);
  assert.ok(validated);
});

test("audit event validates previous_hash format", () => {
  const event = {
    ...baseEvent,
    previous_hash: "not-hex",
  };
  assert.throws(() => validate_mcp_audit_event(event), /previous_hash must be a valid hex string/);
});

test("audit event validates row_hash format", () => {
  const event = {
    ...baseEvent,
    row_hash: "not-hex",
  };
  assert.throws(() => validate_mcp_audit_event(event), /row_hash must be a valid hex string/);
});

test("audit event accepts valid hex hashes", () => {
  const event = {
    ...baseEvent,
    previous_hash: "abcdef123456",
    row_hash: "fedcba654321",
  };
  const validated = validate_mcp_audit_event(event);
  assert.equal(validated.previous_hash, "abcdef123456");
  assert.equal(validated.row_hash, "fedcba654321");
});

test("input object not mutated", () => {
  const original = { ...baseEvent };
  const originalCopy = { ...original };
  validate_mcp_audit_event(original);
  assert.deepEqual(original, originalCopy);
});