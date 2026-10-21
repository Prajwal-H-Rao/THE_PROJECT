/** Prove that the template serves the health endpoints. */
import assert from "node:assert/strict";
import { test } from "node:test";
import type { IncomingMessage, ServerResponse } from "node:http";

import { handleHealth, isHealthPath, liveBody, readyBody } from "../health.js";

/** What a fake response records. */
interface Recorded {
  code: number | null;
  body: string;
}

/** Return a fake request for one path. */
function request(path: string): IncomingMessage {
  return { url: path } as IncomingMessage;
}

/** Return a fake response and the record of what it sent. */
function response(): { record: Recorded; value: ServerResponse } {
  const record: Recorded = { code: null, body: "" };
  const value = {
    writeHead(code: number): ServerResponse {
      record.code = code;
      return value;
    },
    end(body: string): void {
      record.body = body;
    },
  } as unknown as ServerResponse;
  return { record, value };
}

test("the live endpoint reports that the process runs", () => {
  const target = response();
  const handled = handleHealth(request("/health/live"), target.value);
  assert.equal(handled, true);
  assert.equal(target.record.code, 200);
  assert.deepEqual(JSON.parse(target.record.body), { status: "live" });
});

test("the ready endpoint reports that the service accepts traffic", () => {
  const target = response();
  const handled = handleHealth(request("/health/ready"), target.value);
  assert.equal(handled, true);
  assert.equal(target.record.code, 200);
  assert.deepEqual(JSON.parse(target.record.body), { status: "ready" });
});

test("the health endpoints leak no secret", () => {
  assert.deepEqual(Object.keys(liveBody()), ["status"]);
  assert.deepEqual(Object.keys(readyBody()), ["status"]);
});

test("the health paths are the only ones that the service answers", () => {
  assert.equal(isHealthPath("/health/live"), true);
  assert.equal(isHealthPath("/health/ready"), true);
  assert.equal(isHealthPath("/metrics"), false);
});
