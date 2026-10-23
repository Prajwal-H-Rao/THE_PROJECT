/** The consumer side of the event contract. One event id is recorded once. */

import { decodeEnvelope, envelopeId } from "./event-envelope.js";
import type { EventEnvelope } from "./event-envelope.js";

/** A record of the event ids that one consumer already processed. */
export interface ReceiptsStore {
  readonly hold: (eventId: string) => boolean;
  readonly record: (eventId: string) => void;
}

/** The in-memory receipts store. The tests use it; a store may hold rows later. */
export class InMemoryReceipts implements ReceiptsStore {
  private readonly seen = new Set<string>();

  /** Return true when the store already holds one event id. */
  hold(eventId: string): boolean {
    return this.seen.has(eventId);
  }

  /** Add one event id. */
  record(eventId: string): void {
    this.seen.add(eventId);
  }
}

/** The output of one delivery attempt. */
export type Delivery = "processed" | "duplicate";

/** Deliver one envelope at most once per id. The check and the record are one step. */
export function deliverOnce(envelope: EventEnvelope, receipts: ReceiptsStore): Delivery {
  const eventId = envelope.eventId;
  if (receipts.hold(eventId)) {
    return "duplicate";
  }
  receipts.record(eventId);
  return "processed";
}

/** Deliver one envelope keyed by its content address. The token must decode first. */
export function deliverTokenOnce(token: string, receipts: ReceiptsStore): Delivery | "rejected" {
  const parsed = decodeEnvelope(token);
  if (parsed === null) {
    return "rejected";
  }
  // WHY: the transport id of the queue job is the content address. The DB receipts
  // key follows the same rule, so both sides answer one id for one event.
  const contentId = envelopeId(parsed);
  if (receipts.hold(contentId)) {
    return "duplicate";
  }
  receipts.record(contentId);
  return "processed";
}
