/** Tests for the MCP call and response contracts. */

import assert from "node:assert/strict";
import test from "node:test";

import {
  MCPCall,
  MCPResponse,
  MCPError,
  MCPErrorCode,
  validate_mcp_call,
  validate_mcp_response,
} from "./call.js";

const baseCall = {
  call_id: "550e8400-e29b-41d4-a716-446655440000",
  tool: "calendar.create_event",
  arguments: { title: "Meeting", start: "2026-11-01T10:00:00Z" },
  created_at: "2026-10-26T10:00:00.000Z",
};

const baseResponse = {
  call_id: "550e8400-e29b-41d4-a716-446655440000",
  completed_at: "2026-10-26T10:00:01.000Z",
  protocol_version: "1.0",
};

test("valid MCP call passes validation", () => {
  const call = {
    ...baseCall,
    idempotency_key: "idem-123",
    service_jwt: "eyJ...",
    user_id: "user-123",
    correlation_id: "corr-456",
  };

  const validated = validate_mcp_call(call);
  assert.ok(validated.call_id);
  assert.equal(validated.tool, "calendar.create_event");
  assert.equal(validated.idempotency_key, "idem-123");
});

test("MCP call without optional fields works", () => {
  const call = {
    ...baseCall,
    tool: "calendar.read",
    arguments: {},
  };

  const validated = validate_mcp_call(call);
  assert.equal(validated.tool, "calendar.read");
  assert.equal(validated.idempotency_key, undefined);
  assert.equal(validated.service_jwt, undefined);
});

test("successful MCP response validation", () => {
  const response = {
    ...baseResponse,
    ok: true,
    result: { event_id: "evt-123" },
    correlation_id: "corr-456",
  };

  const validated = validate_mcp_response(response);
  assert.equal(validated.ok, true);
  assert.deepEqual(validated.result, { event_id: "evt-123" });
  assert.equal(validated.error, undefined);
});

test("failed MCP response with error", () => {
  const response = {
    ...baseResponse,
    ok: false,
    error: {
      code: "unauthorized",
      message: "Invalid service JWT",
      correlation_id: "corr-456",
    },
  };

  const validated = validate_mcp_response(response);
  assert.equal(validated.ok, false);
  assert.equal(validated.error?.code, "unauthorized");
  assert.equal(validated.error?.message, "Invalid service JWT");
});

test("all MCP error codes are valid strings", () => {
  const codes = [
    "unauthenticated",
    "unauthorized",
    "forbidden",
    "invalid_token",
    "token_expired",
    "wrong_audience",
    "tool_not_found",
    "invalid_arguments",
    "invalid_idempotency_key",
    "idempotency_conflict",
    "tool_timeout",
    "tool_execution_failed",
    "approval_required",
    "approval_expired",
    "approval_revoked",
    "policy_denied",
    "rate_limited",
    "quota_exceeded",
    "internal_error",
    "service_unavailable",
    "validation_failed",
    "schema_mismatch",
    "circuit_open",
    "dependency_failed",
  ];
  assert.ok(codes.includes("unauthenticated"));
  assert.ok(codes.includes("unauthorized"));
  assert.ok(codes.includes("tool_not_found"));
  assert.ok(codes.includes("approval_required"));
  assert.ok(codes.includes("rate_limited"));
  assert.ok(codes.includes("internal_error"));
});

test("MCPError accepts details and correlation_id", () => {
  const error = {
    code: "invalid_arguments",
    message: "Invalid arguments",
    details: { field: "title", issue: "required" },
    correlation_id: "corr-789",
  };

  assert.equal(error.code, "invalid_arguments");
  assert.deepEqual(error.details, { field: "title", issue: "required" });
  assert.equal(error.correlation_id, "corr-789");
});

test("MCPResponse requires call_id", () => {
  const response = {
    ...baseResponse,
    ok: true,
    result: {},
  } as Record<string, unknown>;
  delete response.call_id;
  assert.throws(() => validate_mcp_response(response), /call_id is required/);
});

test("MCPCall validates UUID format", () => {
  const call = {
    ...baseCall,
    call_id: "not-a-uuid",
  };
  assert.throws(() => validate_mcp_call(call), /call_id must be a valid UUID/);
});

// New tests for added validation
test("MCP call missing call_id rejected", () => {
  const call = {
    ...baseCall,
  } as Record<string, unknown>;
  delete call.call_id;
  assert.throws(() => validate_mcp_call(call), /call_id is required/);
});

test("MCP call missing tool rejected", () => {
  const call = {
    ...baseCall,
  } as Record<string, unknown>;
  delete call.tool;
  assert.throws(() => validate_mcp_call(call), /tool is required/);
});

test("MCP call missing arguments rejected", () => {
  const call = {
    ...baseCall,
  } as Record<string, unknown>;
  delete call.arguments;
  assert.throws(() => validate_mcp_call(call), /arguments must be an object/);
});

test("MCP call missing created_at rejected", () => {
  const call = {
    ...baseCall,
  } as Record<string, unknown>;
  delete call.created_at;
  assert.throws(() => validate_mcp_call(call), /created_at is required/);
});

test("MCP call invalid UUID rejected", () => {
  const call = { ...baseCall, call_id: "invalid-uuid" };
  assert.throws(() => validate_mcp_call(call), /call_id must be a valid UUID/);
});

test("MCP response missing call_id rejected", () => {
  const response = {
    ...baseResponse,
    ok: true,
    result: {},
  } as Record<string, unknown>;
  delete response.call_id;
  assert.throws(() => validate_mcp_response(response), /call_id is required/);
});

test("MCP response missing ok rejected", () => {
  const response = {
    ...baseResponse,
    call_id: baseResponse.call_id,
    result: {},
  } as Record<string, unknown>;
  delete (response as Record<string, unknown>).ok;
  assert.throws(() => validate_mcp_response(response), /ok must be a boolean/);
});

test("MCP response ok=true missing result rejected", () => {
  const response = {
    ...baseResponse,
    ok: true,
  } as Record<string, unknown>;
  delete response.result;
  assert.throws(() => validate_mcp_response(response), /result is required when ok is true/);
});

test("MCP response ok=false missing error rejected", () => {
  const response = {
    ...baseResponse,
    ok: false,
  } as Record<string, unknown>;
  delete response.error;
  assert.throws(() => validate_mcp_response(response), /error is required when ok is false/);
});

test("MCP response missing completed_at rejected", () => {
  const response = {
    ...baseResponse,
    ok: true,
    result: {},
  } as Record<string, unknown>;
  delete response.completed_at;
  assert.throws(() => validate_mcp_response(response), /completed_at is required/);
});

test("MCP response missing protocol_version rejected", () => {
  const response = {
    ...baseResponse,
    ok: true,
    result: {},
  } as Record<string, unknown>;
  delete response.protocol_version;
  assert.throws(() => validate_mcp_response(response), /protocol_version is required/);
});

test("MCP response invalid error code rejected", () => {
  const response = {
    ...baseResponse,
    ok: false,
    error: { code: "invalid_code", message: "test" },
  };
  assert.throws(() => validate_mcp_response(response), /Invalid error code/);
});

test("MCP response error missing code rejected", () => {
  const response = {
    ...baseResponse,
    ok: false,
    error: { message: "test" },
  };
  assert.throws(() => validate_mcp_response(response), /error.code is required/);
});

test("MCP response error missing message rejected", () => {
  const response = {
    ...baseResponse,
    ok: false,
    error: { code: "unauthorized" },
  };
  assert.throws(() => validate_mcp_response(response), /error.message is required/);
});

test("MCP response error invalid details rejected", () => {
  const response = {
    ...baseResponse,
    ok: false,
    error: { code: "unauthorized", message: "test", details: "not an object" },
  };
  assert.throws(() => validate_mcp_response(response), /error.details must be an object/);
});

test("input object not mutated - call", () => {
  const original = { ...baseCall };
  const originalCopy = { ...original };
  validate_mcp_call(original);
  assert.deepEqual(original, originalCopy);
});

test("input object not mutated - response", () => {
  const original = { ...baseResponse, ok: true, result: {} };
  const originalCopy = { ...original };
  validate_mcp_response(original);
  assert.deepEqual(original, originalCopy);
});

// Timestamp format validation tests
test("MCP call invalid created_at format rejected", () => {
  const call = { ...baseCall, created_at: "not-a-date" };
  assert.throws(() => validate_mcp_call(call), /created_at must be a valid ISO 8601 timestamp/);
});

test("MCP call created_at without milliseconds accepted", () => {
  const call = { ...baseCall, created_at: "2026-10-26T10:00:00" };
  const validated = validate_mcp_call(call);
  assert.ok(validated);
});

test("MCP call created_at without timezone accepted", () => {
  const call = { ...baseCall, created_at: "2026-10-26T10:00:00.000" };
  const validated = validate_mcp_call(call);
  assert.ok(validated);
});

test("MCP call valid created_at passes", () => {
  const call = { ...baseCall, created_at: "2026-10-26T10:00:00.000Z" };
  const validated = validate_mcp_call(call);
  assert.equal(validated.created_at, "2026-10-26T10:00:00.000Z");
});

test("MCP response invalid completed_at format rejected", () => {
  const response = { ...baseResponse, ok: true, result: {}, completed_at: "not-a-date" };
  assert.throws(() => validate_mcp_response(response), /completed_at must be a valid ISO 8601 timestamp/);
});

test("MCP response completed_at without milliseconds accepted", () => {
  const response = { ...baseResponse, ok: true, result: {}, completed_at: "2026-10-26T10:00:00" };
  const validated = validate_mcp_response(response);
  assert.ok(validated);
});

test("MCP response completed_at without timezone accepted", () => {
  const response = { ...baseResponse, ok: true, result: {}, completed_at: "2026-10-26T10:00:00.000" };
  const validated = validate_mcp_response(response);
  assert.ok(validated);
});

test("MCP response valid completed_at passes", () => {
  const response = { ...baseResponse, ok: true, result: {}, completed_at: "2026-10-26T10:00:00.000Z" };
  const validated = validate_mcp_response(response);
  assert.equal(validated.completed_at, "2026-10-26T10:00:00.000Z");
});

// Array rejection tests
test("MCP call arguments as array rejected", () => {
  const call = { ...baseCall, arguments: [] };
  assert.throws(() => validate_mcp_call(call), /arguments must be an object/);
});

test("MCP response result as array rejected", () => {
  const response = { ...baseResponse, ok: true, result: [] };
  assert.throws(() => validate_mcp_response(response), /result must be an object when ok is true/);
});

test("MCP response error.details as array rejected", () => {
  const response = {
    ...baseResponse,
    ok: false,
    error: { code: "unauthorized", message: "test", details: [] },
  };
  assert.throws(() => validate_mcp_response(response), /error.details must be an object/);
});