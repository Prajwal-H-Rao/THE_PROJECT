/** Prove that the gateway holds the body limit. */

import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { after, before, test } from "node:test";

import { gatewayClient, makeClaims, signToken } from "./session-fixture.js";
import { startGateway, TEST_SECRET } from "./server-fixture.js";
import type { Gateway } from "./server-fixture.js";

let gateway: Gateway;

before(async () => {
  gateway = await startGateway({ NOVA_MAX_BODY_BYTES: "1024" });
});

after(async () => {
  await gateway.stop();
});

test("test_body_limit_returns_413", async () => {
  const client = gatewayClient(gateway.baseUrl, { token: signToken(makeClaims(), TEST_SECRET) });
  const response = await client.post("/api/v1/tasks", { note: "x".repeat(4096) });
  assert.equal(response.status, 413);
  const body = response.data as { error: string };
  assert.equal(body.error, "body_too_large");
});

test("test_oversized_chunked_body_does_not_kill_the_process", async () => {
  const client = gatewayClient(gateway.baseUrl, { token: signToken(makeClaims(), TEST_SECRET) });
  const body = Readable.from([Buffer.from(JSON.stringify({ note: "x".repeat(8192) }))]);
  const response = await client.post("/api/v1/tasks", body, {
    headers: { "content-type": "application/json" },
  });
  assert.equal(response.status, 413);
  const answer = response.data as { error: string };
  assert.equal(answer.error, "body_too_large");
  const alive = await client.get("/health/live");
  assert.equal(alive.status, 200);
});
