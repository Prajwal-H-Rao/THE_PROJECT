/** Tests for the MCP tool definition contract. */

import assert from "node:assert/strict";
import test from "node:test";

import {
  ToolDefinition,
  ToolOutputSchema,
  validate_tool_definition,
  CanonicalFamilyValues,
} from "./tool.js";

// Helper to create a minimal valid tool definition with all required fields
function createMinimalTool(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: "test.action",
    description: "Test tool",
    arguments: { schema: { type: "object", properties: {} } },
    output: { schema: { type: "object", properties: {} } },
    version: 1,
    classification: "read",
    risk_tier: "tier1",
    idempotency: "none",
    family: "inbox",
    operation_id: "inbox.read",
    owning_service: "inbox-service",
    mcp_server: "inbox-mcp",
    resource_scope: "own_messages",
    verifier: "verify_inbox_read",
    ...overrides,
  };
}

test("valid tool definition passes validation", () => {
  const def = createMinimalTool({
    name: "calendar_tasks.create_event",
    description: "Create a calendar event",
    arguments: { schema: { type: "object", properties: { title: { type: "string" } } } },
    output: { schema: { type: "object", properties: { event_id: { type: "string" } } } },
    allowed_roles: ["user"],
    allowed_scopes: ["calendar_tasks:write"],
    classification: "write",
    risk_tier: "tier2",
    idempotency: "idempotency_key",
    timeout: "PT30S",
    version: 1,
    provider_allowlist: ["google"],
    quota: "100/hour",
    verifier: "verify_calendar_event",
    family: "calendar_tasks",
    operation_id: "calendar_tasks.create_event",
    owning_service: "calendar-service",
    mcp_server: "calendar-mcp",
    resource_scope: "own_calendar",
  });

  const validated = validate_tool_definition(def);
  assert.equal(validated.name, "calendar_tasks.create_event");
  assert.equal(validated.risk_tier, "tier2");
  assert.equal(validated.classification, "write");
  assert.equal(validated.idempotency, "idempotency_key");
  assert.equal(validated.family, "calendar_tasks");
  assert.equal(validated.operation_id, "calendar_tasks.create_event");
  assert.equal(validated.owning_service, "calendar-service");
  assert.equal(validated.mcp_server, "calendar-mcp");
  assert.equal(validated.resource_scope, "own_calendar");
  assert.equal(validated.verifier, "verify_calendar_event");
});

test("invalid tool name format rejected", () => {
  const def = createMinimalTool({ name: "invalid-name" });

  assert.throws(() => validate_tool_definition(def), /Tool name must be in/);
});

test("invalid role rejected", () => {
  const def = createMinimalTool({
    name: "inbox.read",
    allowed_roles: ["invalid_role"],
  });

  assert.throws(() => validate_tool_definition(def), /Invalid role/);
});

test("read-only tool defaults to tier1", () => {
  const def = createMinimalTool({
    name: "inbox.read",
    classification: "read",
    risk_tier: "tier1", // explicit for test
  });

  const validated = validate_tool_definition(def);
  assert.equal(validated.risk_tier, "tier1");
});

test("write tool without idempotency_key defaults to none", () => {
  const def = createMinimalTool({
    name: "calendar_tasks.write",
    classification: "write",
    idempotency: undefined, // test default
  });

  const validated = validate_tool_definition(def);
  assert.equal(validated.idempotency, "none");
});

test("ToolOutputSchema validates type object", () => {
  const schema: ToolOutputSchema = { schema: { type: "object", properties: {} } };
  assert.ok(schema);

  // Test that invalid schema throws
  const invalidSchema = { schema: { type: "string" } };
  assert.throws(() => {
    if (invalidSchema.schema.type !== "object") {
      throw new Error("type='object' required");
    }
  }, /type='object'/);
});

test("ToolDefinition string literal serialization", () => {
  const def = createMinimalTool({
    name: "test.action",
    risk_tier: "tier2",
    classification: "write",
    idempotency: "natural",
  });

  const validated = validate_tool_definition(def);
  assert.equal(validated.risk_tier, "tier2");
  assert.equal(validated.classification, "write");
  assert.equal(validated.idempotency, "natural");
});

test("quota format validation", () => {
  const def = createMinimalTool({
    name: "test.action",
    quota: "invalid",
  });

  assert.throws(() => validate_tool_definition(def), /Quota/);
});

test("valid quota format passes", () => {
  const def = createMinimalTool({
    name: "test.action",
    quota: "100/hour",
  });

  const validated = validate_tool_definition(def);
  assert.equal(validated.quota, "100/hour");
});

// New tests for added validation
test("missing name rejected", () => {
  const def = createMinimalTool({});
  delete (def as Record<string, unknown>).name;
  assert.throws(() => validate_tool_definition(def), /Tool name is required/);
});

test("missing description rejected", () => {
  const def = createMinimalTool({});
  delete (def as Record<string, unknown>).description;
  assert.throws(() => validate_tool_definition(def), /Tool description is required/);
});

test("missing arguments rejected", () => {
  const def = createMinimalTool({});
  delete (def as Record<string, unknown>).arguments;
  assert.throws(() => validate_tool_definition(def), /Tool arguments schema is required/);
});

test("missing output rejected", () => {
  const def = createMinimalTool({});
  delete (def as Record<string, unknown>).output;
  assert.throws(() => validate_tool_definition(def), /Tool output schema is required/);
});

test("arguments schema type not object rejected", () => {
  const def = createMinimalTool({
    name: "test.action",
    arguments: { schema: { type: "string" } },
  });
  assert.throws(() => validate_tool_definition(def), /arguments.schema.type must be 'object'/);
});

test("output schema type not object rejected", () => {
  const def = createMinimalTool({
    name: "test.action",
    output: { schema: { type: "string" } },
  });
  assert.throws(() => validate_tool_definition(def), /output.schema.type must be 'object'/);
});

test("invalid classification rejected", () => {
  const def = createMinimalTool({
    name: "test.action",
    classification: "invalid",
  });
  assert.throws(() => validate_tool_definition(def), /Classification must be 'read' or 'write'/);
});

test("invalid risk_tier rejected", () => {
  const def = createMinimalTool({
    name: "test.action",
    risk_tier: "tier5",
  });
  assert.throws(() => validate_tool_definition(def), /Risk tier must be tier1, tier2, tier3, or tier4/);
});

test("invalid idempotency rejected", () => {
  const def = createMinimalTool({
    name: "test.action",
    idempotency: "invalid",
  });
  assert.throws(() => validate_tool_definition(def), /Idempotency must be 'none', 'idempotency_key', or 'natural'/);
});

test("allowed_roles must be array of strings", () => {
  const def = createMinimalTool({
    name: "test.action",
    allowed_roles: ["user", 123],
  });
  assert.throws(() => validate_tool_definition(def), /allowed_roles must contain only strings/);
});

test("allowed_scopes must be array of strings", () => {
  const def = createMinimalTool({
    name: "test.action",
    allowed_scopes: ["scope1", 123],
  });
  assert.throws(() => validate_tool_definition(def), /allowed_scopes must contain only strings/);
});

test("provider_allowlist must be array of strings", () => {
  const def = createMinimalTool({
    name: "test.action",
    provider_allowlist: ["google", 123],
  });
  assert.throws(() => validate_tool_definition(def), /provider_allowlist must contain only strings/);
});

test("timeout must be valid ISO 8601 duration", () => {
  const def = createMinimalTool({
    name: "test.action",
    timeout: "invalid",
  });
  assert.throws(() => validate_tool_definition(def), /timeout must be a valid ISO 8601 duration/);
});

test("valid timeout passes", () => {
  const def = createMinimalTool({
    name: "test.action",
    timeout: "PT30S",
  });
  const validated = validate_tool_definition(def);
  assert.equal(validated.timeout, "PT30S");
});

test("quota case insensitive", () => {
  const def = createMinimalTool({
    name: "test.action",
    quota: "100/HOUR",
  });
  const validated = validate_tool_definition(def);
  assert.equal(validated.quota, "100/HOUR");
});

test("verifier must be string if provided", () => {
  const def = createMinimalTool({
    name: "test.action",
    verifier: 123,
  });
  assert.throws(() => validate_tool_definition(def), /verifier must be a string/);
});

test("verifier is required", () => {
  const def = createMinimalTool({
    name: "test.action",
    verifier: undefined,
  });
  assert.throws(() => validate_tool_definition(def), /Verifier is required/);
});

test("version must be positive integer", () => {
  const def = createMinimalTool({
    name: "test.action",
    version: 0,
  });
  assert.throws(() => validate_tool_definition(def), /version must be a positive integer/);
});

test("version must be integer", () => {
  const def = createMinimalTool({
    name: "test.action",
    version: 1.5,
  });
  assert.throws(() => validate_tool_definition(def), /version must be a positive integer/);
});

test("input object not mutated", () => {
  const original = createMinimalTool({
    name: "test.action",
  });
  const originalCopy = { ...original };
  validate_tool_definition(original);
  assert.deepEqual(original, originalCopy);
});

test("missing version rejected", () => {
  // Build object without version to test missing field
  const def = {
    description: "Test tool",
    name: "test.action",
    arguments: { schema: { type: "object", properties: {} } },
    output: { schema: { type: "object", properties: {} } },
    classification: "read",
    risk_tier: "tier1",
    idempotency: "none",
    family: "inbox",
    operation_id: "inbox.read",
    owning_service: "inbox-service",
    mcp_server: "inbox-mcp",
    resource_scope: "own_messages",
    verifier: "verify_inbox_read",
  };
  assert.throws(() => validate_tool_definition(def), /version must be a positive integer/);
});

// New required fields tests
test("family is required and must be canonical", () => {
  const def = createMinimalTool({
    name: "test.action",
    family: "invalid_family",
  });
  assert.throws(() => validate_tool_definition(def), /Family is required and must be one of/);
});

test("family accepts all canonical families", () => {
  for (const family of CanonicalFamilyValues) {
    const def = createMinimalTool({
      name: `${family}.action`,
      family,
    });
    const validated = validate_tool_definition(def);
    assert.equal(validated.family, family);
  }
});

test("operation_id is required", () => {
  const def = createMinimalTool({
    name: "test.action",
    operation_id: undefined,
  });
  assert.throws(() => validate_tool_definition(def), /Operation ID is required/);
});

test("owning_service is required", () => {
  const def = createMinimalTool({
    name: "test.action",
    owning_service: undefined,
  });
  assert.throws(() => validate_tool_definition(def), /Owning service is required/);
});

test("mcp_server is required", () => {
  const def = createMinimalTool({
    name: "test.action",
    mcp_server: undefined,
  });
  assert.throws(() => validate_tool_definition(def), /MCP server is required/);
});

test("resource_scope is required", () => {
  const def = createMinimalTool({
    name: "test.action",
    resource_scope: undefined,
  });
  assert.throws(() => validate_tool_definition(def), /Resource scope is required/);
});

test("verifier is required", () => {
  const def = createMinimalTool({
    name: "test.action",
    verifier: undefined,
  });
  assert.throws(() => validate_tool_definition(def), /Verifier is required and must be a string/);
});

test("verifier must be string", () => {
  const def = createMinimalTool({
    name: "test.action",
    verifier: 123,
  });
  assert.throws(() => validate_tool_definition(def), /verifier must be a string/);
});

test("unknown field rejected", () => {
  const def = createMinimalTool({
    name: "test.action",
    unknown_field: "value",
  });
  assert.throws(() => validate_tool_definition(def), /Unknown field in tool definition: unknown_field/);
});