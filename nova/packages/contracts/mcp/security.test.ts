/**
 * MCP security suite (task 21.13, module 21).
 * Every case must be denied:
 *  1. forged JWT          -> bad_signature
 *  2. wrong audience      -> unknown_audience
 *  3. missing scope       -> missing_scope
 *  4. viewer write        -> forbidden
 *  5. missing grant       -> approval_required
 *  6. tool shadowing      -> tool_not_found
 *  7. replay              -> replay_detected
 *  8. oversize            -> quota_exceeded
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { validateAndAuthorizeCall, loadCatalogue } from "./server/index.js";
import { issueToken } from "../service-token.js";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const CATALOGUE_DIR = join(process.cwd(), "mcp/catalogue");

const AUDIENCE = "nova-internal";
const SECRET = "test-secret-for-the-service-tokens-00";

// Set env vars for JWT verification (read by verifyServiceJWT in registry.ts)
process.env.NOVA_SERVICE_JWT_SECRET = SECRET;
process.env.NOVA_SERVICE_JWT_ISSUER = "nova.test";

// Load the calendar_tasks catalogue once (it has read and write tools).
const catalogue = loadCatalogueSync(CATALOGUE_DIR);

function loadCatalogueSync(dir: string): Awaited<ReturnType<typeof loadCatalogue>> {
  const tools = new Map<string, any>();
  const byFamily = new Map<string, any[]>();

  let files: string[];
  try {
    files = readdirSync(dir).filter((f: string) => f.endsWith(".json"));
  } catch {
    return { tools, byFamily } as Awaited<ReturnType<typeof loadCatalogue>>;
  }

  for (const file of files) {
    const content = readFileSync(join(dir, file), "utf8");
    const familyData = JSON.parse(content);

    for (const op of familyData.operations) {
      tools.set(op.name, op);
      const familyTools = byFamily.get(op.family) || [];
      familyTools.push(op);
      byFamily.set(op.family, familyTools);
    }
  }

  return { tools, byFamily } as Awaited<ReturnType<typeof loadCatalogue>>;
}

// A valid service JWT for the calendar service with user role and write scope.
const validJwt = issueToken(
  {
    iss: "nova.test",
    aud: AUDIENCE,
    sub: "calendar-service",
    scope: "calendar_tasks:write",
    roles: ["user"],
  },
  SECRET,
);

// A viewer JWT (has write scope but viewer role - fails role check).
const viewerJwt = issueToken(
  {
    iss: "nova.test",
    aud: AUDIENCE,
    sub: "calendar-service",
    scope: "calendar_tasks:write",
    roles: ["viewer"],
  },
  SECRET,
);

// A JWT with wrong audience.
const wrongAudienceJwt = issueToken(
  {
    iss: "nova.test",
    aud: "other-audience",
    sub: "calendar-service",
    scope: "calendar_tasks:write",
    roles: ["user"],
  },
  SECRET,
);

// A JWT with invite scope (for tier3 invite tool).
const inviteJwt = issueToken(
  {
    iss: "nova.test",
    aud: AUDIENCE,
    sub: "calendar-service",
    scope: "calendar_tasks:invite",
    roles: ["user"],
  },
  SECRET,
);

// A JWT with read-only scope (missing write scope).
const readOnlyJwt = issueToken(
  {
    iss: "nova.test",
    aud: AUDIENCE,
    sub: "calendar-service",
    scope: "calendar_tasks:read",
    roles: ["user"],
  },
  SECRET,
);

// A forged JWT (tampered signature).
const forgedJwt = validJwt.slice(0, -5) + "xxxxx";

// A mock grant client that always approves.
const approvingGrantClient: any = {
  verifyGrant: async (): Promise<{ ok: true }> => ({ ok: true }),
};

// Base call template (each test creates a unique call_id via nextCallId()).
const baseCall = {
  tool: "calendar_tasks.create_event",
  arguments: { title: "Meeting", start: "2026-11-01T10:00:00Z", duration_minutes: 30 },
  created_at: "2026-11-01T10:00:00.000Z",
};

// Unique call IDs to avoid replay detection between tests.
let callCounter = 0;
function nextCallId(): string {
  return `550e8400-e29b-41d4-a716-44665544${String(callCounter++).padStart(4, "0")}`;
}

function makeCall(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...baseCall, call_id: nextCallId(), ...overrides };
}

describe("MCP security suite", () => {
  it("test_mcp_forged_jwt_rejected", async () => {
    const result = await validateAndAuthorizeCall(
      makeCall({ tool: "calendar_tasks.create_event" }),
      catalogue,
      forgedJwt,
      AUDIENCE,
      approvingGrantClient,
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "bad_signature");
    }
  });

  it("test_mcp_wrong_audience_rejected", async () => {
    const result = await validateAndAuthorizeCall(
      makeCall({ tool: "calendar_tasks.create_event" }),
      catalogue,
      wrongAudienceJwt,
      AUDIENCE,
      approvingGrantClient,
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "unknown_audience");
    }
  });

  it("test_mcp_missing_scope_rejected", async () => {
    const result = await validateAndAuthorizeCall(
      makeCall({ tool: "calendar_tasks.create_event" }),
      catalogue,
      readOnlyJwt,
      AUDIENCE,
      approvingGrantClient,
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "missing_scope");
    }
  });

  it("test_mcp_viewer_write_rejected", async () => {
    const result = await validateAndAuthorizeCall(
      makeCall({ tool: "calendar_tasks.create_event" }),
      catalogue,
      viewerJwt,
      AUDIENCE,
      approvingGrantClient,
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "forbidden");
    }
  });

  it("test_mcp_missing_grant_rejected", async () => {
    // calendar_tasks.invite is tier3 (requires approval grant)
    const callNoGrant = makeCall({
      tool: "calendar_tasks.invite",
      arguments: { event_id: "evt-1", attendees: ["alice@example.com"] },
    });
    delete (callNoGrant as Record<string, unknown>).approval_grant;
    const result = await validateAndAuthorizeCall(
      callNoGrant,
      catalogue,
      inviteJwt,
      AUDIENCE,
      approvingGrantClient,
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "approval_required");
    }
  });

  it("test_mcp_tool_shadowing_rejected", async () => {
    // Use a tool name not owned by calendar service (finance.transfer is in finance.json)
    const unknownCall = makeCall({ tool: "finance.transfer" });
    const result = await validateAndAuthorizeCall(
      unknownCall,
      catalogue,
      validJwt,
      AUDIENCE,
      approvingGrantClient,
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "tool_not_found");
    }
  });

  it("test_mcp_replay_rejected", async () => {
    const callId = nextCallId();
    const firstCall = makeCall({ tool: "calendar_tasks.create_event", call_id: callId });
    // First call should succeed
    const first = await validateAndAuthorizeCall(
      firstCall,
      catalogue,
      validJwt,
      AUDIENCE,
      approvingGrantClient,
    );
    assert.equal(first.ok, true);
    // Second call with same call_id should be rejected
    const replayCall = { ...firstCall };
    const result = await validateAndAuthorizeCall(
      replayCall,
      catalogue,
      validJwt,
      AUDIENCE,
      approvingGrantClient,
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "replay_detected");
    }
  });

  it("test_mcp_oversize_rejected", async () => {
    const oversizedCall = makeCall({
      tool: "calendar_tasks.create_event",
      arguments: { ...baseCall.arguments, payload: "x".repeat(2 * 1024 * 1024) }, // 2MB
    });
    const result = await validateAndAuthorizeCall(
      oversizedCall,
      catalogue,
      validJwt,
      AUDIENCE,
      approvingGrantClient,
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "quota_exceeded");
    }
  });

  it("test_mcp_valid_call_accepted", async () => {
    const validCall = makeCall({
      tool: "calendar_tasks.create_event",
      approval_grant: "grant-123",
    });
    const result = await validateAndAuthorizeCall(
      validCall,
      catalogue,
      validJwt,
      AUDIENCE,
      approvingGrantClient,
    );
    assert.equal(result.ok, true);
  });
});
