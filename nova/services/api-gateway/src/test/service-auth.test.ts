/** Prove that the internal branch holds the service token gate on every answer. */

import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { issueToken } from "@nova/contracts";

import { gatewayClient } from "./session-fixture.js";
import { startGateway } from "./server-fixture.js";
import type { Gateway } from "./server-fixture.js";

// The service key that the fixture env holds. It holds more than 32 bytes.
const SERVICE_KEY = "test-service-key-for-the-internal-routes-0";

let gateway: Gateway;

before(async () => {
  gateway = await startGateway({ NOVA_SERVICE_JWT_SECRET: SERVICE_KEY });
});

after(async () => {
  await gateway.stop();
});

/** Issue one service token with the claims that the tests use. */
function serviceToken(overrides: Record<string, string> = {}): string {
  return issueToken(
    { iss: "nova", aud: "nova-internal", sub: "jobs-service",
      scope: "jobs.write", ...overrides },
    SERVICE_KEY,
    Math.floor(Date.now() / 1000),
  );
}

test("test_service_call_with_a_valid_token_passes", async () => {
  const client = gatewayClient(gateway.baseUrl);
  const response = await client.get("/api/internal/echo", {
    headers: { authorization: "Bearer " + serviceToken() },
  });
  assert.equal(response.status, 200);
  const body = response.data as { ok: boolean; service: string; scope: string };
  assert.equal(body.ok, true);
  assert.equal(body.service, "jobs-service");
  assert.equal(body.scope, "jobs.write");
});

test("test_service_call_without_a_token_is_denied", async () => {
  const client = gatewayClient(gateway.baseUrl);
  const response = await client.get("/api/internal/echo");
  assert.equal(response.status, 401);
  const body = response.data as { error: string };
  assert.equal(body.error, "missing_service_token");
});

test("test_service_call_with_alg_none_is_denied", async () => {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" }), "utf8")
    .toString("base64url");
  const body = Buffer.from(JSON.stringify({
    iss: "nova", aud: "nova-internal", sub: "x", scope: "s",
    iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 60,
  }), "utf8").toString("base64url");
  const client = gatewayClient(gateway.baseUrl);
  const response = await client.get("/api/internal/echo", {
    headers: { authorization: "Bearer " + header + "." + body + "." },
  });
  assert.equal(response.status, 401);
  const answer = response.data as { error: string };
  assert.equal(answer.error, "unsupported_algorithm");
});

test("test_service_call_with_a_foreign_key_is_denied", async () => {
  const fake = issueToken(
    { iss: "nova", aud: "nova-internal", sub: "jobs-service", scope: "jobs.write" },
    "another-service-key-of-thirty-two-bytes-x",
    Math.floor(Date.now() / 1000),
  );
  const client = gatewayClient(gateway.baseUrl);
  const response = await client.get("/api/internal/echo", {
    headers: { authorization: "Bearer " + fake },
  });
  assert.equal(response.status, 401);
  const body = response.data as { error: string };
  assert.equal(body.error, "bad_signature");
});

test("test_service_call_with_an_issuer_swap_is_denied", async () => {
  const client = gatewayClient(gateway.baseUrl);
  const response = await client.get("/api/internal/echo", {
    headers: { authorization: "Bearer " + serviceToken({ iss: "stranger" }) },
  });
  assert.equal(response.status, 401);
  const body = response.data as { error: string };
  assert.equal(body.error, "unknown_issuer");
});

test("test_session_chain_still_guards_the_versioned_routes", async () => {
  // WHY: the internal branch must not weaken the human chain. One boundary check
  // keeps the split honest on the same build.
  const client = gatewayClient(gateway.baseUrl);
  const response = await client.get("/api/v1/tasks");
  assert.equal(response.status, 401);
  const body = response.data as { error: string };
  assert.equal(body.error, "no_session");
});
