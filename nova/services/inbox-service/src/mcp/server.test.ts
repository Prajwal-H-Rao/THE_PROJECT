/**
 * Test for task 21.12: inbox-service MCP server rejects calls without a
 * provider token and lists only its own tools.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { handleMCPCall } from "./server.js";

describe("inbox MCP server auth", () => {
  const baseCall = {
    call_id: "550e8400-e29b-41d4-a716-446655440000",
    tool: "inbox.send",
    arguments: { recipient: "alice@example.com", subject: "Hello" },
    created_at: "2026-11-01T00:00:00.000Z",
  };

  it("rejects a call without a service JWT", async () => {
    const result = await handleMCPCall(
      baseCall as Record<string, unknown>,
      "",
      "nova-inbox",
      undefined as any,
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error, "no service token provided");
    }
  });

  it("rejects a call for a tool not owned by this service", async () => {
    const result = await handleMCPCall(
      { ...baseCall, tool: "finance.transfer" } as Record<string, unknown>,
      "fake.jwt.token",
      "nova-inbox",
      undefined as any,
    );
    assert.equal(result.ok, false);
  });
});
