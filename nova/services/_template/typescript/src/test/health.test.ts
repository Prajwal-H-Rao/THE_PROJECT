/** Prove that the template serves the health endpoints over HTTP. */
import assert from "node:assert/strict";
import { test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import { createService } from "../app.js";
import { liveBody, readyBody } from "../health.js";

/** Start the service on an ephemeral port. It returns the server and the port. */
async function startService(): Promise<{ server: Server; port: number }> {
  const server = createService();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  return { server, port: address.port };
}

/** Stop the service. */
function stopService(server: Server): Promise<void> {
  return new Promise<void>((resolve) => server.close(() => resolve()));
}

test("the service serves the live endpoint over HTTP", async () => {
  const { server, port } = await startService();
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health/live`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "live" });
  } finally {
    await stopService(server);
  }
});

test("the service serves the ready endpoint over HTTP", async () => {
  const { server, port } = await startService();
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health/ready`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ready" });
  } finally {
    await stopService(server);
  }
});

test("the service refuses any other path", async () => {
  const { server, port } = await startService();
  try {
    const response = await fetch(`http://127.0.0.1:${port}/metrics`);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "not_found" });
  } finally {
    await stopService(server);
  }
});

test("the health endpoints leak no secret", () => {
  assert.deepEqual(Object.keys(liveBody()), ["status"]);
  assert.deepEqual(Object.keys(readyBody()), ["status"]);
});
