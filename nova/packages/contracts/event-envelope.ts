/** The event envelope contract. One event carries one minimal, versioned payload. */

import { createHash } from "node:crypto";

/** The schema version this module writes. Bump only with a reader upgrade. */
export const ENVELOPE_SCHEMA_VERSION = 1;

/** The envelope of one event in the shape the code reads. */
export interface EventEnvelope {
  readonly eventId: string;
  readonly eventType: string;
  readonly schemaVersion: number;
  readonly occurredAt: string;
  readonly producer: string;
  readonly correlationId: string;
  readonly causationId: string;
  readonly subjectId: string;
  readonly userId: string;
}

/** The envelope as it crosses the wire, in the field names of spec:755. */
export interface WireEnvelope {
  readonly event_id: string;
  readonly event_type: string;
  readonly schema_version: number;
  readonly occurred_at: string;
  readonly producer: string;
  readonly correlation_id: string;
  readonly causation_id: string;
  readonly subject_id: string;
  readonly user_id: string;
}

/** Return true when the value is a non-empty text. */
function isText(value: unknown): value is string {
  return typeof value === "string" && value !== "";
}

/** Validate one event envelope. A rejection returns null and names no secret. */
export function readEnvelope(input: unknown): EventEnvelope | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const eventId = record["event_id"];
  const eventType = record["event_type"];
  const schemaVersion = record["schema_version"];
  const occurredAt = record["occurred_at"];
  const producer = record["producer"];
  const correlationId = record["correlation_id"];
  const causationId = record["causation_id"];
  const subjectId = record["subject_id"];
  const userId = record["user_id"];
  if (!isText(eventId) || !isText(eventType) || !isText(occurredAt)) {
    return null;
  }
  if (!isText(producer) || !isText(correlationId) || !isText(causationId)) {
    return null;
  }
  if (!isText(subjectId) || typeof userId !== "string") {
    return null;
  }
  if (typeof schemaVersion !== "number" || !Number.isInteger(schemaVersion) || schemaVersion < 1) {
    return null;
  }
  return {
    eventId,
    eventType,
    schemaVersion,
    occurredAt,
    producer,
    correlationId,
    causationId,
    subjectId,
    userId,
  };
}

/** Build the wire names of one envelope. The order is fixed, so the bytes stay stable. */
export function toWire(envelope: EventEnvelope): WireEnvelope {
  return {
    event_id: envelope.eventId,
    event_type: envelope.eventType,
    schema_version: envelope.schemaVersion,
    occurred_at: envelope.occurredAt,
    producer: envelope.producer,
    correlation_id: envelope.correlationId,
    causation_id: envelope.causationId,
    subject_id: envelope.subjectId,
    user_id: envelope.userId,
  };
}

/** Encode one envelope as the transport token. It never holds whitespace or '='. */
export function encodeEnvelope(envelope: EventEnvelope): string {
  const wire = toWire(envelope);
  return Buffer.from(JSON.stringify(wire), "utf8").toString("base64url");
}

/** Decode one transport token. A rejection returns null. */
export function decodeEnvelope(token: string): EventEnvelope | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
    return readEnvelope(parsed);
  } catch {
    return null;
  }
}

/** Return a stable event id for one envelope. The id is content-addressed and opaque. */
export function envelopeId(envelope: EventEnvelope): string {
  return createHash("sha256").update(JSON.stringify(toWire(envelope)), "utf8").digest("hex");
}
