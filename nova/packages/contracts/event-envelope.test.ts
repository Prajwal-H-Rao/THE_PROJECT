/** The tests of the event envelope contract. Rejections and wire shape get cases. */

import assert from "node:assert/strict";
import test from "node:test";

import { decodeEnvelope, encodeEnvelope, readEnvelope, toWire } from "./event-envelope.js";
import type { EventEnvelope } from "./event-envelope.js";

const SAMPLE = {
  event_id: "b7c9d1e4-0000-4a00-8b00-111122223333",
  event_type: "note.created",
  schema_version: 1,
  occurred_at: "2026-10-23T09:00:00Z",
  producer: "notes-service",
  correlation_id: "corr-1",
  causation_id: "cause-1",
  subject_id: "note-1",
  user_id: "user-1",
};

function valid(): EventEnvelope {
  return readEnvelope(SAMPLE) as EventEnvelope;
}

test("a valid envelope reads back", () => {
  const read = readEnvelope(SAMPLE);
  assert.ok(read !== null);
  assert.equal(read.eventType, "note.created");
  assert.equal(read.schemaVersion, 1);
});

test("a missing field is rejected", () => {
  const broken = { ...SAMPLE } as Record<string, unknown>;
  delete broken["causation_id"];
  assert.equal(readEnvelope(broken), null);
});

test("a non-text field is rejected", () => {
  assert.equal(readEnvelope({ ...SAMPLE, producer: 42 }), null);
});

test("a non-integer schema version is rejected", () => {
  assert.equal(readEnvelope({ ...SAMPLE, schema_version: 1.5 }), null);
  assert.equal(readEnvelope({ ...SAMPLE, schema_version: 0 }), null);
});

test("non-object input is rejected", () => {
  assert.equal(readEnvelope(null), null);
  assert.equal(readEnvelope("x"), null);
});

test("the wire shape names the spec fields in order", () => {
  const wire = toWire(valid());
  assert.deepEqual(Object.keys(wire), [
    "event_id",
    "event_type",
    "schema_version",
    "occurred_at",
    "producer",
    "correlation_id",
    "causation_id",
    "subject_id",
    "user_id",
  ]);
});

test("the transport token holds no whitespace and no padding byte", () => {
  const token = encodeEnvelope(valid());
  assert.match(token, /^[A-Za-z0-9_-]+$/);
});

test("the token round-trips", () => {
  const back = decodeEnvelope(encodeEnvelope(valid()));
  assert.ok(back !== null);
  assert.equal(back.eventId, SAMPLE.event_id);
  assert.equal(back.userId, SAMPLE.user_id);
});

test("a broken token decodes to null", () => {
  assert.equal(decodeEnvelope("!!!"), null);
  assert.equal(decodeEnvelope(""), null);
});
