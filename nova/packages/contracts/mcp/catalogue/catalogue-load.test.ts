/**
 * Tests for MCP catalogue loading and tool definition validation.
 * Verifies all catalogue JSON files parse and validate, and that
 * overwrite-confirmation arguments are present where required.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { loadCatalogue } from "../server/registry.js";
import { validate_tool_definition } from "../tool.js";

const CATALOGUE_DIR = "/home/prajwal/THE_PROJECT/nova/packages/contracts/mcp/catalogue";

describe("MCP catalogue load", () => {
  it("loads all catalogue files without error", async () => {
    const catalogue = await loadCatalogue(CATALOGUE_DIR);
    assert.ok(catalogue);
    assert.ok(catalogue.tools.size > 0);
  });

  it("validates every operation in the catalogue", async () => {
    const catalogue = await loadCatalogue(CATALOGUE_DIR);
    for (const [name, tool] of catalogue.tools) {
      const raw: Record<string, unknown> = {
        name: tool.name,
        description: tool.description,
        arguments: tool.arguments,
        output: tool.output,
        version: tool.version,
        classification: tool.classification,
        risk_tier: tool.risk_tier,
        idempotency: tool.idempotency,
        family: tool.family,
        operation_id: tool.operation_id,
        owning_service: tool.owning_service,
        mcp_server: tool.mcp_server,
        resource_scope: tool.resource_scope,
        verifier: tool.verifier,
      };
      if (tool.allowed_roles) raw.allowed_roles = tool.allowed_roles;
      if (tool.allowed_scopes) raw.allowed_scopes = tool.allowed_scopes;
      const validated = validate_tool_definition(raw);
      assert.equal(validated.name, name);
    }
  });

  it("notes_memory.create declares confirm_overwrite", async () => {
    const catalogue = await loadCatalogue(CATALOGUE_DIR);
    const tool = catalogue.tools.get("notes_memory.create");
    assert.ok(tool, "notes_memory.create must exist");
    const props = tool.arguments.schema.properties as Record<string, unknown>;
    assert.ok("confirm_overwrite" in props, "create must declare confirm_overwrite");
    assert.deepStrictEqual(props["confirm_overwrite"], { type: "boolean" });
  });

  it("notes_memory.link declares confirm_overwrite", async () => {
    const catalogue = await loadCatalogue(CATALOGUE_DIR);
    const tool = catalogue.tools.get("notes_memory.link");
    assert.ok(tool, "notes_memory.link must exist");
    const props = tool.arguments.schema.properties as Record<string, unknown>;
    assert.ok("confirm_overwrite" in props, "link must declare confirm_overwrite");
    assert.deepStrictEqual(props["confirm_overwrite"], { type: "boolean" });
  });

  it("notes_memory family includes read, link, summarise", async () => {
    const catalogue = await loadCatalogue(CATALOGUE_DIR);
    for (const name of ["notes_memory.read", "notes_memory.link", "notes_memory.summarise"]) {
      assert.ok(catalogue.tools.has(name), `${name} must be registered`);
    }
  });
});
