/**
 * The event envelope of the local queue flow. The module holds no workspace
 * import: the runner image copies only queues/, so a `@nova/contracts` import
 * would dangle here. The wire field names follow spec:755 contract shape.
 */

import { createHash, randomUUID } from "node:crypto";

/** The schema version this module writes. Bump only with a reader upgrade. */
export const ENVELOPE_SCHEMA_VERSION = 1;

/** Build one envelope object. The caller encodes it once and derives the id.
 * A caller may pin the correlation id; the trace flow uses the trace id. */
export function buildEnvelope(eventType, producer, subjectId, correlationId) {
  return {
    event_id: randomUUID(),
    event_type: eventType,
    schema_version: ENVELOPE_SCHEMA_VERSION,
    occurred_at: new Date().toISOString(),
    producer,
    correlation_id: typeof correlationId === "string" && correlationId !== ""
      ? correlationId
      : randomUUID(),
    causation_id: randomUUID(),
    subject_id: subjectId,
    user_id: "system",
  };
}

/** Encode one envelope as the transport token. Base64url holds no '=' and no whitespace. */
export function encodeEnvelope(envelope) {
  return Buffer.from(JSON.stringify(envelope), "utf8").toString("base64url");
}

/** Return the content address of one envelope. The receipts key follows this rule. */
export function envelopeIdOf(envelope) {
  return createHash("sha256").update(JSON.stringify(envelope), "utf8").digest("hex");
}

/** Decode one transport token back. A broken token returns null. */
export function decodeEnvelope(token) {
  try {
    const parsed = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
