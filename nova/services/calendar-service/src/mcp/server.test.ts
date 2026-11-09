/**
 * Test for task 21.11: calendar MCP server rejects calls without a provider token.
 * Task 09.12: attendee-aware approval for invite events.
 * A call without a valid service JWT fails before any provider call.
 * An invite call without an approval grant is rejected (task 09.12).
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

  it("rejects an invite call without an approval grant", async () => {
    const { issueToken } = await import(
      "../../../packages/contracts/dist/service-token.js"
    );
    const SECRET = "test-secret-for-the-service-tokens-00";
    const AUDIENCE = "nova-internal";
    process.env.NOVA_SERVICE_JWT_SECRET = SECRET;
    process.env.NOVA_SERVICE_JWT_ISSUER = "nova.test";

    const validJwt = issueToken(
      {
        iss: "nova.test",
        aud: AUDIENCE,
        sub: "calendar-service",
        scope: "calendar_tasks:invite",
        roles: ["user"],
      },
      SECRET
    );

    const inviteCall = {
      call_id: "550e8400-e29b-41d4-a716-446655440002",
      tool: "calendar_tasks.invite",
      arguments: {
        title: "Team meeting",
        start: "2026-11-01T10:00:00Z",
        end: "2026-11-01T11:00:00Z",
        attendees: ["alice@example.com"],
      },
      created_at: "2026-11-01T00:00:00.000Z",
    };
    const result = await handleMCPCall(
      inviteCall as Record<string, unknown>,
      validJwt,
      AUDIENCE,
      undefined as any,
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "approval_required");
    }
  });
});
