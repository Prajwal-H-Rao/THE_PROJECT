/** Tests for the application envelope (task 12.12). */

import assert from "node:assert/strict";
import { test } from "node:test";
import { buildEnvelope, envelopeMatches, isEnvelopeValid, envelopeCanonicalPayload } from "./envelope.js";

test("buildEnvelope produces all required fields", () => {
  const envelope = buildEnvelope("job-1", "user-1", { title: "Backend Engineer" }, "2026-12-13T10:00:00Z", "v1");
  assert.equal(envelope.jobId, "job-1");
  assert.equal(envelope.userId, "user-1");
  assert.equal(envelope.expiry, "2026-12-13T10:00:00Z");
  assert.equal(envelope.toolVersion, "v1");
  assert.ok(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(envelope.nonce));
  assert.ok(/^[0-9a-f]{64}$/.test(envelope.payloadHash));
});

test("one byte change invalidates the envelope hash", () => {
  const payload = { title: "Backend Engineer" };
  const envelope = buildEnvelope("job-1", "user-1", payload, "2026-12-13T10:00:00Z", "v1");
  assert.equal(envelopeMatches(envelope, payload), true);

  const altered = { title: "Backend Engineer!" };
  assert.equal(envelopeMatches(envelope, altered), false);
});

test("canonical payload is deterministic", () => {
  const a = envelopeCanonicalPayload({ b: 2, a: 1 });
  const b = envelopeCanonicalPayload({ a: 1, b: 2 });
  assert.equal(a, b);
  assert.equal(a, '{"a":1,"b":2}');
});

test("isEnvelopeValid rejects expired envelopes", () => {
  const valid = buildEnvelope("job-1", "user-1", {}, "2099-12-13T10:00:00Z", "v1");
  assert.equal(isEnvelopeValid(valid), true);

  const expired = buildEnvelope("job-1", "user-1", {}, "2000-01-01T00:00:00Z", "v1");
  assert.equal(isEnvelopeValid(expired), false);
});
