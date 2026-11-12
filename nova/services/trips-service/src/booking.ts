/**
 * Nova trips service - Booking (task 11.16, module 11).
 * Books a trip behind an approval grant. Creates a deterministic booking
 * record from the trip details. No money moves here — this is a record of
 * the booking intent, not a financial transfer (spec:190). The booking is
 * gated behind an approval grant at the MCP layer (trips.book is tier3 in
 * the catalogue; registry.ts requires approval_grant for tier3/tier4).
 * Pure function, no pg, no credentials, no model calls.
 */

import { createHash } from "node:crypto";

export interface TripBookingDetails {
  readonly tripId: string;
  readonly origin: string;
  readonly destination: string;
  readonly travelDate: string; // ISO date
  readonly fareMinor: number; // integer minor units, estimate only
}

export interface BookingRecord {
  readonly bookingId: string;
  readonly tripId: string;
  readonly origin: string;
  readonly destination: string;
  readonly travelDate: string;
  readonly fareMinor: number;
  readonly status: string; // always "booked" once grant-verified
  readonly createdAtMs: number;
}

/** Purpose: canonical JSON with sorted keys, no whitespace, for stable hashing. */
function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map((item) => canonicalJson(item ?? null)).join(",") + "]";
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
  return (
    "{" +
    entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",") +
    "}"
  );
}

/** Purpose: SHA-256 hex digest over canonical JSON bytes of the payload. */
function hashPayload(payload: unknown): string {
  return createHash("sha256").update(canonicalJson(payload), "utf8").digest("hex");
}

/** Purpose: create a deterministic booking record. The booking_id is a
 *  content-addressed hash of the trip details, so the same inputs always
 *  produce the same booking_id. */
export function bookTrip(
  details: TripBookingDetails,
  nowMs: number = Date.now(),
): BookingRecord {
  const payload = {
    tripId: details.tripId,
    origin: details.origin,
    destination: details.destination,
    travelDate: details.travelDate,
    fareMinor: details.fareMinor,
  };
  const bookingId = hashPayload(payload);
  return {
    bookingId,
    tripId: details.tripId,
    origin: details.origin,
    destination: details.destination,
    travelDate: details.travelDate,
    fareMinor: details.fareMinor,
    status: "booked",
    createdAtMs: nowMs,
  };
}
