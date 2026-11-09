/**
 * Test for task 21.11: calendar MCP server rejects calls without a provider token.
 * A call without a valid service JWT fails before any provider call.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { handleMCPCall } from "./server.js";

describe("calendar MCP server auth", () => {
  const baseCall = {
    call_id: "550e8400-e29b-41d4-a716-446655440000",
    tool: "calendar_tasks.read",
    arguments: { start: "2026-11-01T00:00:00Z", end: "2026-11-02T00:00:00Z" },
    created_at: "2026-11-01T00:00:00.000Z",
  };

  it("rejects a call without a service JWT", async () => {
    const result = await handleMCPCall(
      baseCall as Record<string, unknown>,
      "", // no service_jwt
      "nova-calendar",
      undefined as any,
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error, "no service token provided");
    }
  });

  it("rejects a call with an empty service JWT", async () => {
    const result = await handleMCPCall(
      baseCall as Record<string, unknown>,
      "",
      "nova-calendar",
      undefined as any,
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error, "no service token provided");
    }
  });
});
