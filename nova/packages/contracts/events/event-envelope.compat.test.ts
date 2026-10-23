/** Backward-compatibility test for the event envelope.
 * Ensures that v1 envelopes encoded with the current schema can be decoded
 * by future readers, and that the wire format stays stable. */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
  readEnvelope,
  toWire,
  encodeEnvelope,
  decodeEnvelope,
  envelopeId,
  ENVELOPE_SCHEMA_VERSION,
} from "./event-envelope.js";
import { deliverOnce, deliverTokenOnce, InMemoryReceipts } from "./event-consumers.js";

describe("event envelope backward compatibility", () => {
  const validEnvelope = {
    event_id: "550e8400-e29b-41d4-a716-446655440000",
    event_type: "user.created",
    schema_version: ENVELOPE_SCHEMA_VERSION,
    occurred_at: "2026-10-23T10:00:00Z",
    producer: "identity_service",
    correlation_id: "550e8400-e29b-41d4-a716-446655440001",
    causation_id: "550e8400-e29b-41d4-a716-446655440002",
    subject_id: "550e8400-e29b-41d4-a716-446655440003",
    user_id: "550e8400-e29b-41d4-a716-446655440004",
  };

  it("readEnvelope accepts a valid v1 envelope", () => {
    const parsed = readEnvelope(validEnvelope);
    assert(parsed !== null);
    assert.strictEqual(parsed.eventId, validEnvelope.event_id);
    assert.strictEqual(parsed.schemaVersion, ENVELOPE_SCHEMA_VERSION);
    assert.strictEqual(parsed.correlationId, validEnvelope.correlation_id);
    assert.strictEqual(parsed.causationId, validEnvelope.causation_id);
  });

  it("toWire produces the exact wire field names from spec:755", () => {
    const parsed = readEnvelope(validEnvelope);
    assert(parsed !== null);
    const wire = toWire(parsed);
    assert.deepStrictEqual(Object.keys(wire).sort(), [
      "causation_id",
      "correlation_id",
      "event_id",
      "event_type",
      "occurred_at",
      "producer",
      "schema_version",
      "subject_id",
      "user_id",
    ]);
  });

  it("encodeEnvelope produces a base64url token without padding", () => {
    const parsed = readEnvelope(validEnvelope);
    assert(parsed !== null);
    const token = encodeEnvelope(parsed);
    assert.ok(!token.includes("="));
    assert.ok(!token.includes("+"));
    assert.ok(!token.includes("/"));
  });

  it("decodeEnvelope round-trips a valid envelope", () => {
    const parsed = readEnvelope(validEnvelope);
    assert(parsed !== null);
    const token = encodeEnvelope(parsed);
    const decoded = decodeEnvelope(token);
    assert(decoded !== null);
    assert.strictEqual(decoded.eventId, parsed.eventId);
    assert.strictEqual(decoded.schemaVersion, parsed.schemaVersion);
    assert.strictEqual(decoded.correlationId, parsed.correlationId);
    assert.strictEqual(decoded.causationId, parsed.causationId);
  });

  it("envelopeId is stable and content-addressed", () => {
    const parsed = readEnvelope(validEnvelope);
    assert(parsed !== null);
    const id1 = envelopeId(parsed);
    const id2 = envelopeId(parsed);
    assert.strictEqual(id1, id2);
    assert.strictEqual(id1.length, 64); // sha256 hex
  });

  it("envelopeId changes when any field changes", () => {
    const parsed = readEnvelope(validEnvelope);
    assert(parsed !== null);
    const id1 = envelopeId(parsed);

    const modified = { ...parsed, eventType: "user.updated" };
    const id2 = envelopeId(modified);
    assert.notStrictEqual(id1, id2);
  });

  it("deliverOnce processes first delivery and rejects duplicate", () => {
    const receipts = new InMemoryReceipts();
    const parsed = readEnvelope(validEnvelope);
    assert(parsed !== null);

    const first = deliverOnce(parsed, receipts);
    assert.strictEqual(first, "processed");

    const second = deliverOnce(parsed, receipts);
    assert.strictEqual(second, "duplicate");
  });

  it("deliverTokenOnce decodes and deduplicates by content address", () => {
    const receipts = new InMemoryReceipts();
    const parsed = readEnvelope(validEnvelope);
    assert(parsed !== null);
    const token = encodeEnvelope(parsed);

    const first = deliverTokenOnce(token, receipts);
    assert.strictEqual(first, "processed");

    const second = deliverTokenOnce(token, receipts);
    assert.strictEqual(second, "duplicate");
  });

  it("deliverTokenOnce rejects invalid tokens", () => {
    const receipts = new InMemoryReceipts();
    const result = deliverTokenOnce("invalid.token", receipts);
    assert.strictEqual(result, "rejected");
  });

  it("wire format field order is deterministic", () => {
    const parsed = readEnvelope(validEnvelope);
    assert(parsed !== null);
    const wire1 = JSON.stringify(toWire(parsed));
    const wire2 = JSON.stringify(toWire(parsed));
    assert.strictEqual(wire1, wire2);
  });

  it("rejects envelope with missing required fields", () => {
    const { event_id: _, ...missingEventId } = validEnvelope;
    assert.strictEqual(readEnvelope(missingEventId), null);

    const { schema_version: __, ...missingSchemaVersion } = validEnvelope;
    assert.strictEqual(readEnvelope(missingSchemaVersion), null);

    const { correlation_id: ___, ...missingCorrelationId } = validEnvelope;
    assert.strictEqual(readEnvelope(missingCorrelationId), null);
  });

  it("rejects envelope with non-integer schema version", () => {
    const badSchema = { ...validEnvelope, schema_version: "one" };
    assert.strictEqual(readEnvelope(badSchema), null);

    const floatSchema = { ...validEnvelope, schema_version: 1.5 };
    assert.strictEqual(readEnvelope(floatSchema), null);
  });
});