/** Prove that the gateway rejects every request without a valid session. */

import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import {
  gatewayClient,
  makeClaims,
  sessionCookie,
  signToken,
} from "./session-fixture.js";
import { startGateway, TEST_SECRET } from "./server-fixture.js";
import type { Gateway } from "./server-fixture.js";

let gateway: Gateway;

before(async () => {
  gateway = await startGateway();
});

after(async () => {
  await gateway.stop();
});

test("test_gateway_rejects_unauthenticated_request", async () => {
  const client = gatewayClient(gateway.baseUrl);
  const response = await client.get("/api/v1/jobs");
  assert.equal(response.status, 401);
  const body = response.data as { error: string };
  assert.equal(body.error, "no_session");
});

test("test_gateway_rejects_a_bad_signature", async () => {
  const token = signToken(makeClaims(), "another-secret-that-is-long-enough");
  const client = gatewayClient(gateway.baseUrl, { cookie: sessionCookie(token) });
  const response = await client.get("/api/v1/jobs");
  assert.equal(response.status, 401);
  const body = response.data as { error: string };
  assert.equal(body.error, "bad_signature");
});

test("test_gateway_rejects_an_expired_session", async () => {
  const now = Math.floor(Date.now() / 1000);
  const token = signToken(makeClaims({ iat: now - 7200, exp: now - 3600 }), TEST_SECRET);
  const client = gatewayClient(gateway.baseUrl, { cookie: sessionCookie(token) });
  const response = await client.get("/api/v1/jobs");
  assert.equal(response.status, 401);
  const body = response.data as { error: string };
  assert.equal(body.error, "expired_token");
});

test("test_gateway_rejects_a_malformed_token", async () => {
  const client = gatewayClient(gateway.baseUrl, { cookie: sessionCookie("not-a-token") });
  const response = await client.get("/api/v1/jobs");
  assert.equal(response.status, 401);
  const body = response.data as { error: string };
  assert.equal(body.error, "malformed_token");
});

test("test_gateway_rejects_two_different_tokens", async () => {
  const token = signToken(makeClaims(), TEST_SECRET);
  const other = signToken(makeClaims({ sid: "session-2" }), TEST_SECRET);
  const client = gatewayClient(gateway.baseUrl, {
    cookie: sessionCookie(token),
    token: other,
  });
  const response = await client.get("/api/v1/jobs");
  assert.equal(response.status, 401);
  const body = response.data as { error: string };
  assert.equal(body.error, "conflicting_session_tokens");
});

test("test_gateway_accepts_a_valid_session", async () => {
  const token = signToken(makeClaims(), TEST_SECRET);
  const client = gatewayClient(gateway.baseUrl, { cookie: sessionCookie(token) });
  const response = await client.get("/api/v1/jobs");
  assert.equal(response.status, 404);
  const body = response.data as { user_id: string };
  assert.equal(body.user_id, "user-1");
});

test("test_the_answer_holds_no_token", async () => {
  const token = signToken(makeClaims(), TEST_SECRET);
  const client = gatewayClient(gateway.baseUrl, { cookie: sessionCookie(token) });
  const response = await client.get("/api/v1/jobs");
  const answer = JSON.stringify(response.data) + JSON.stringify(response.headers);
  assert.equal(answer.includes(token), false);
  assert.equal(answer.includes(TEST_SECRET), false);
});

test("test_missing_secret_refuses_start", async () => {
  await assert.rejects(
    () => startGateway({ NOVA_SESSION_SECRET: "" }),
    /not ready/);
});

test("test_health_leaks_no_secret", async () => {
  const client = gatewayClient(gateway.baseUrl);
  const response = await client.get("/health/live");
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(response.data as object), ["status"]);
});
