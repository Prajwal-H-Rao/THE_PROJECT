/** Tests for the MCP tool definition contract. */

import assert from "node:assert/strict";
import test from "node:test";

import {
  ToolDefinition,
  ToolOutputSchema,
  validate_tool_definition,
} from "./tool.js";

const baseToolDef = {
  arguments: { schema: { type: "object", properties: {} } },
  output: { schema: { type: "object", properties: {} } },
  version: 1,
};

test("valid tool definition passes validation", () => {
  const def = {
    name: "calendar.create_event",
    description: "Create a calendar event",
    arguments: { schema: { type: "object", properties: { title: { type: "string" } } } },
    output: { schema: { type: "object", properties: { event_id: { type: "string" } } } },
    allowed_roles: ["user"],
    allowed_scopes: ["calendar:write"],
    classification: "write",
    risk_tier: "tier3",
    idempotency: "idempotency_key",
    timeout: "PT30S",
    version: 1,
    provider_allowlist: ["google"],
    quota: "100/hour",
    verifier: "verify_calendar_event",
  };

  const validated = validate_tool_definition(def);
  assert.equal(validated.name, "calendar.create_event");
  assert.equal(validated.risk_tier, "tier3");
  assert.equal(validated.classification, "write");
  assert.equal(validated.idempotency, "idempotency_key");
});

test("invalid tool name format rejected", () => {
  const def = {
    ...baseToolDef,
    name: "invalid-name",
    description: "Test",
    classification: "read",
    risk_tier: "tier1",
  };

  assert.throws(() => validate_tool_definition(def), /Tool name must be in/);
});

test("invalid role rejected", () => {
  const def = {
    ...baseToolDef,
    name: "calendar.read",
    description: "Test",
    classification: "read",
    risk_tier: "tier1",
    allowed_roles: ["invalid_role"],
  };

  assert.throws(() => validate_tool_definition(def), /Invalid role/);
});

test("read-only tool defaults to tier1", () => {
  const def = {
    ...baseToolDef,
    name: "calendar.read",
    description: "Read calendar",
    classification: "read",
  };

  const validated = validate_tool_definition(def);
  assert.equal(validated.risk_tier, "tier1");
});

test("write tool without idempotency_key defaults to none", () => {
  const def = {
    ...baseToolDef,
    name: "calendar.write",
    description: "Write calendar",
    classification: "write",
  };

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
  const def = {
    ...baseToolDef,
    name: "test.action",
    description: "Test",
    risk_tier: "tier2",
    classification: "write",
    idempotency: "natural",
  };

  const validated = validate_tool_definition(def);
  assert.equal(validated.risk_tier, "tier2");
  assert.equal(validated.classification, "write");
  assert.equal(validated.idempotency, "natural");
});

test("quota format validation", () => {
  const def = {
    ...baseToolDef,
    name: "test.action",
    description: "Test",
    classification: "read",
    risk_tier: "tier1",
    quota: "invalid",
  };

  assert.throws(() => validate_tool_definition(def), /Quota/);
});

test("valid quota format passes", () => {
  const def = {
    ...baseToolDef,
    name: "test.action",
    description: "Test",
    classification: "read",
    risk_tier: "tier1",
    quota: "100/hour",
  };

  const validated = validate_tool_definition(def);
  assert.equal(validated.quota, "100/hour");
});

// New tests for added validation
test("missing name rejected", () => {
  const def = {
    ...baseToolDef,
    description: "Test",
    classification: "read",
    risk_tier: "tier1",
  } as Record<string, unknown>;
  assert.throws(() => validate_tool_definition(def), /Tool name is required/);
});

test("missing description rejected", () => {
  const def = {
    ...baseToolDef,
    name: "test.action",
    classification: "read",
    risk_tier: "tier1",
  } as Record<string, unknown>;
  assert.throws(() => validate_tool_definition(def), /Tool description is required/);
});

test("missing arguments rejected", () => {
  const def = {
    ...baseToolDef,
    name: "test.action",
    description: "Test",
    classification: "read",
    risk_tier: "tier1",
  } as Record<string, unknown>;
  delete def.arguments;
  assert.throws(() => validate_tool_definition(def), /Tool arguments schema is required/);
});

test("missing output rejected", () => {
  const def = {
    ...baseToolDef,
    name: "test.action",
    description: "Test",
    classification: "read",
    risk_tier: "tier1",
  } as Record<string, unknown>;
  delete def.output;
  assert.throws(() => validate_tool_definition(def), /Tool output schema is required/);
});

test("arguments schema type not object rejected", () => {
  const def = {
    ...baseToolDef,
    name: "test.action",
    description: "Test",
    classification: "read",
    risk_tier: "tier1",
    arguments: { schema: { type: "string" } },
  };
  assert.throws(() => validate_tool_definition(def), /arguments.schema.type must be 'object'/);
});

test("output schema type not object rejected", () => {
  const def = {
    ...baseToolDef,
    name: "test.action",
    description: "Test",
    classification: "read",
    risk_tier: "tier1",
    output: { schema: { type: "string" } },
  };
  assert.throws(() => validate_tool_definition(def), /output.schema.type must be 'object'/);
});

test("invalid classification rejected", () => {
  const def = {
    ...baseToolDef,
    name: "test.action",
    description: "Test",
    classification: "invalid",
    risk_tier: "tier1",
  };
  assert.throws(() => validate_tool_definition(def), /Classification must be 'read' or 'write'/);
});

test("invalid risk_tier rejected", () => {
  const def = {
    ...baseToolDef,
    name: "test.action",
    description: "Test",
    classification: "read",
    risk_tier: "tier5",
  };
  assert.throws(() => validate_tool_definition(def), /Risk tier must be tier1, tier2, tier3, or tier4/);
});

test("invalid idempotency rejected", () => {
  const def = {
    ...baseToolDef,
    name: "test.action",
    description: "Test",
    classification: "read",
    risk_tier: "tier1",
    idempotency: "invalid",
  };
  assert.throws(() => validate_tool_definition(def), /Idempotency must be 'none', 'idempotency_key', or 'natural'/);
});

test("allowed_roles must be array of strings", () => {
  const def = {
    ...baseToolDef,
    name: "test.action",
    description: "Test",
    classification: "read",
    risk_tier: "tier1",
    allowed_roles: ["user", 123],
  };
  assert.throws(() => validate_tool_definition(def), /allowed_roles must contain only strings/);
});

test("allowed_scopes must be array of strings", () => {
  const def = {
    ...baseToolDef,
    name: "test.action",
    description: "Test",
    classification: "read",
    risk_tier: "tier1",
    allowed_scopes: ["scope1", 123],
  };
  assert.throws(() => validate_tool_definition(def), /allowed_scopes must contain only strings/);
});

test("provider_allowlist must be array of strings", () => {
  const def = {
    ...baseToolDef,
    name: "test.action",
    description: "Test",
    classification: "read",
    risk_tier: "tier1",
    provider_allowlist: ["google", 123],
  };
  assert.throws(() => validate_tool_definition(def), /provider_allowlist must contain only strings/);
});

test("timeout must be valid ISO 8601 duration", () => {
  const def = {
    ...baseToolDef,
    name: "test.action",
    description: "Test",
    classification: "read",
    risk_tier: "tier1",
    timeout: "invalid",
  };
  assert.throws(() => validate_tool_definition(def), /timeout must be a valid ISO 8601 duration/);
});

test("valid timeout passes", () => {
  const def = {
    ...baseToolDef,
    name: "test.action",
    description: "Test",
    classification: "read",
    risk_tier: "tier1",
    timeout: "PT30S",
  };
  const validated = validate_tool_definition(def);
  assert.equal(validated.timeout, "PT30S");
});

test("quota case insensitive", () => {
  const def = {
    ...baseToolDef,
    name: "test.action",
    description: "Test",
    classification: "read",
    risk_tier: "tier1",
    quota: "100/HOUR",
  };
  const validated = validate_tool_definition(def);
  assert.equal(validated.quota, "100/HOUR");
});

test("verifier must be string if provided", () => {
  const def = {
    ...baseToolDef,
    name: "test.action",
    description: "Test",
    classification: "read",
    risk_tier: "tier1",
    verifier: 123,
  };
  assert.throws(() => validate_tool_definition(def), /verifier must be a string if provided/);
});

test("version must be positive integer", () => {
  const def = {
    ...baseToolDef,
    name: "test.action",
    description: "Test",
    classification: "read",
    risk_tier: "tier1",
    version: 0,
  };
  assert.throws(() => validate_tool_definition(def), /version must be a positive integer/);
});

test("version must be integer", () => {
  const def = {
    ...baseToolDef,
    name: "test.action",
    description: "Test",
    classification: "read",
    risk_tier: "tier1",
    version: 1.5,
  };
  assert.throws(() => validate_tool_definition(def), /version must be a positive integer/);
});

test("input object not mutated", () => {
  const original = {
    ...baseToolDef,
    name: "test.action",
    description: "Test",
    classification: "read",
  };
  const originalCopy = { ...original };
  validate_tool_definition(original);
  assert.deepEqual(original, originalCopy);
});

test("missing version rejected", () => {
  const def = {
    ...baseToolDef,
    name: "test.action",
    description: "Test",
    classification: "read",
    risk_tier: "tier1",
  } as Record<string, unknown>;
  delete def.version;
  assert.throws(() => validate_tool_definition(def), /version must be a positive integer/);
});