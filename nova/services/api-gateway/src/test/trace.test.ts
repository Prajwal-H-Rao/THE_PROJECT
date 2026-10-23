/** Prove that the gateway holds the W3C trace rules at the edge. */

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";

import { resolveTrace, traceparentOf } from "../lib/trace.js";

/** Build one Request with header overrides. */
function requestWith(headers: Record<string, string>): Request {
  return new Request("https://nova.test/api/v1/probe", { headers });
}

/** Build one valid traceparent value from random parts. */
function freshHeader(): string {
  return "00-" + randomBytes(16).toString("hex") + "-" + randomBytes(8).toString("hex") + "-01";
}

test("a valid traceparent header carries its trace id", () => {
  const header = freshHeader();
  const context = resolveTrace(requestWith({ traceparent: header }));
  const field = header.split("-")[1];
  assert.equal(context.traceId, field);
  assert.match(context.traceId, /^[0-9a-f]{32}$/);
  assert.match(context.spanId, /^[0-9a-f]{16}$/);
});

test("an invalid traceparent is rejected for a generated id", () => {
  const context = resolveTrace(requestWith({ traceparent: "garbage-value" }));
  assert.notEqual(context.traceId, "garbage-value");
  assert.match(context.traceId, /^[0-9a-f]{32}$/);
});

test("a valid correlation id rides the trace", () => {
  const context = resolveTrace(requestWith({ "x-correlation-id": "corr-1" }));
  assert.equal(context.correlationId, "corr-1");
});

test("an invalid correlation id falls back to the trace id", () => {
  const context = resolveTrace(requestWith({ "x-correlation-id": "spaces spaces" }));
  assert.equal(context.correlationId, context.traceId);
});

test("a request with no headers holds a generated context", () => {
  const context = resolveTrace(requestWith({}));
  assert.match(context.traceId, /^[0-9a-f]{32}$/);
  assert.equal(traceparentOf(context), "00-" + context.traceId + "-" + context.spanId + "-01");
});

test("the outbound traceparent stays well formed", () => {
  const header = freshHeader();
  const context = resolveTrace(requestWith({ traceparent: header }));
  const outbound = traceparentOf(context);
  assert.match(outbound, /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
});
