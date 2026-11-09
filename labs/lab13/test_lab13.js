/**
 * Lab 13: MCP Surface and Tool Authorization.
 *
 * Verifies that the MCP server rejects unauthorised calls:
 *  1. Forged JWT          -> bad_signature
 *  2. Wrong audience      -> unknown_audience
 *  3. Missing scope       -> missing_scope
 *  4. Viewer write        -> forbidden
 *  5. Missing grant       -> approval_required
 *  6. Tool shadowing      -> tool_not_found
 *  7. Replay              -> replay_detected
 *  8. Oversize            -> quota_exceeded
 *
 * Every case must be denied and audited.
 */

import { validateAndAuthorizeCall, loadCatalogue } from "/home/prajwal/THE_PROJECT/nova/packages/contracts/dist/mcp/server/index.js";
import { issueToken } from "/home/prajwal/THE_PROJECT/nova/packages/contracts/dist/service-token.js";

const CATALOGUE_DIR = "/home/prajwal/THE_PROJECT/nova/packages/contracts/mcp/catalogue";
const AUDIENCE = "nova-internal";
const SECRET = "test-secret-for-the-service-tokens-00";

process.env.NOVA_SERVICE_JWT_SECRET = SECRET;
process.env.NOVA_SERVICE_JWT_ISSUER = "nova.test";

let catalogue;

async function main() {
  catalogue = await loadCatalogue(CATALOGUE_DIR);

  const validJwt = issueToken(
    { iss: "nova.test", aud: AUDIENCE, sub: "calendar-service", scope: "calendar_tasks:write", roles: ["user"] },
    SECRET,
  );

  const viewerJwt = issueToken(
    { iss: "nova.test", aud: AUDIENCE, sub: "calendar-service", scope: "calendar_tasks:write", roles: ["viewer"] },
    SECRET,
  );

  const wrongAudienceJwt = issueToken(
    { iss: "nova.test", aud: "other-audience", sub: "calendar-service", scope: "calendar_tasks:write", roles: ["user"] },
    SECRET,
  );

  const readOnlyJwt = issueToken(
    { iss: "nova.test", aud: AUDIENCE, sub: "calendar-service", scope: "calendar_tasks:read", roles: ["user"] },
    SECRET,
  );

  const inviteJwt = issueToken(
    { iss: "nova.test", aud: AUDIENCE, sub: "calendar-service", scope: "calendar_tasks:invite", roles: ["user"] },
    SECRET,
  );

  const forgedJwt = validJwt.slice(0, -5) + "xxxxx";

  const approvingGrantClient = {
    verifyGrant: async () => ({ ok: true }),
  };

  let callCounter = 0;
  function nextCallId() {
    return `550e8400-e29b-41d4-a716-44665544${String(callCounter++).padStart(4, "0")}`;
  }

  function makeCall(tool, args = {}) {
    return {
      call_id: nextCallId(),
      tool,
      arguments: args,
      created_at: "2026-11-01T10:00:00.000Z",
    };
  }

  async function runTest(name, call, jwt, expectedCode) {
    const result = await validateAndAuthorizeCall(call, catalogue, jwt, AUDIENCE, approvingGrantClient);
    if (result.ok) {
      console.error(`  FAIL: ${name} — expected denial, got approval`);
      return false;
    }
    if (result.code !== expectedCode) {
      console.error(`  FAIL: ${name} — expected code ${expectedCode}, got ${result.code}`);
      return false;
    }
    console.log(`  PASS: ${name} (code: ${result.code})`);
    return true;
  }

  console.log("Lab 13: MCP Surface and Tool Authorization");
  console.log("=============================================");

  let allPassed = true;

  // 1. Forged JWT
  allPassed = (await runTest(
    "Forged JWT",
    makeCall("calendar_tasks.create_event"),
    forgedJwt,
    "bad_signature",
  )) && allPassed;

  // 2. Wrong audience
  allPassed = (await runTest(
    "Wrong audience",
    makeCall("calendar_tasks.create_event"),
    wrongAudienceJwt,
    "unknown_audience",
  )) && allPassed;

  // 3. Missing scope
  allPassed = (await runTest(
    "Missing scope",
    makeCall("calendar_tasks.create_event"),
    readOnlyJwt,
    "missing_scope",
  )) && allPassed;

  // 4. Viewer write
  allPassed = (await runTest(
    "Viewer write",
    makeCall("calendar_tasks.create_event"),
    viewerJwt,
    "forbidden",
  )) && allPassed;

  // 5. Missing grant (calendar_tasks.invite is tier3)
  const callNoGrant = makeCall("calendar_tasks.invite", { event_id: "evt-1", attendees: ["alice@example.com"] });
  delete callNoGrant.approval_grant;
  allPassed = (await runTest(
    "Missing grant",
    callNoGrant,
    inviteJwt,
    "approval_required",
  )) && allPassed;

  // 6. Tool shadowing
  allPassed = (await runTest(
    "Tool shadowing",
    makeCall("finance.transfer"),
    validJwt,
    "tool_not_found",
  )) && allPassed;

  // 7. Replay
  const replayCallId = nextCallId();
  const firstCall = makeCall("calendar_tasks.create_event", { call_id: replayCallId });
  await validateAndAuthorizeCall(firstCall, catalogue, validJwt, AUDIENCE, approvingGrantClient);
  const replayCall = { ...firstCall };
  const replayResult = await validateAndAuthorizeCall(replayCall, catalogue, validJwt, AUDIENCE, approvingGrantClient);
  if (replayResult.ok || replayResult.code !== "replay_detected") {
    console.error(`  FAIL: Replay — expected replay_detected, got ${replayResult.ok ? "approval" : replayResult.code}`);
    allPassed = false;
  } else {
    console.log("  PASS: Replay (code: replay_detected)");
  }

  // 8. Oversize
  const oversizedCall = makeCall("calendar_tasks.create_event", {
    ...baseCall.arguments,
    payload: "x".repeat(2 * 1024 * 1024),
  });
  const oversizeResult = await validateAndAuthorizeCall(oversizedCall, catalogue, validJwt, AUDIENCE, approvingGrantClient);
  if (oversizeResult.ok || oversizeResult.code !== "quota_exceeded") {
    console.error(`  FAIL: Oversize — expected quota_exceeded, got ${oversizeResult.ok ? "approval" : oversizeResult.code}`);
    allPassed = false;
  } else {
    console.log("  PASS: Oversize (code: quota_exceeded)");
  }

  console.log("");
  if (allPassed) {
    console.log("Lab 13: All MCP security tests passed.");
  } else {
    console.log("Lab 13: Some MCP security tests FAILED.");
  }
  return allPassed;
}

const baseCall = {
  tool: "calendar_tasks.create_event",
  arguments: { title: "Meeting", start: "2026-11-01T10:00:00Z", duration_minutes: 30 },
  created_at: "2026-11-01T10:00:00.000Z",
};

const success = await main();
process.exit(success ? 0 : 1);
