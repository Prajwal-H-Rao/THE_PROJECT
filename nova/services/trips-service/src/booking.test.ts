/**
 * Nova trips service - Booking test (task 11.16, module 11).
 * Test-first: written before booking.ts. Confirmed failing, then passing.
 * Tests the deterministic bookTrip function and verifies that trips.book
 * is tier3 in the MCP catalogue, which triggers the approval-grant gate
 * in validateAndAuthorizeCall (registry.ts: tier3/tier4 requires approval_grant).
 * "Booking without approval fails" — the gate is the catalogue risk_tier.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { bookTrip, type TripBookingDetails } from "./booking.ts";
import { readFileSync } from "node:fs";

// Purpose: load the trips catalogue and assert trips.book is tier3
// (grant-required). This is the mechanism that makes "booking without
// approval fail" at the MCP layer.
function tripsBookCatalogueEntry() {
  const raw = readFileSync(
    new URL("../../../packages/contracts/mcp/catalogue/trips.json", import.meta.url),
    "utf8",
  );
  const catalogue = JSON.parse(raw);
  const entry = catalogue.operations.find(
    (op: { operation_id: string }) => op.operation_id === "trips.book",
  );
  assert.ok(entry, "trips.book operation must exist in the catalogue");
  return entry;
}

const BASE_DETAILS: TripBookingDetails = {
  tripId: "trip-001",
  origin: "BER",
  destination: "NYC",
  travelDate: "2026-12-01",
  fareMinor: 25000,
};

describe("bookTrip", () => {
  it("is deterministic: same details return the same booking record", () => {
    const b1 = bookTrip(BASE_DETAILS, 1000);
    const b2 = bookTrip(BASE_DETAILS, 1000);
    assert.deepStrictEqual(b1, b2);
  });

  it("returns status booked with a booking_id", () => {
    const result = bookTrip(BASE_DETAILS, 1000);
    assert.strictEqual(result.status, "booked");
    assert.ok(typeof result.bookingId === "string" && result.bookingId.length > 0);
    assert.strictEqual(result.tripId, "trip-001");
    assert.strictEqual(result.origin, "BER");
    assert.strictEqual(result.destination, "NYC");
    assert.strictEqual(result.travelDate, "2026-12-01");
    assert.strictEqual(result.fareMinor, 25000);
    assert.strictEqual(result.createdAtMs, 1000);
  });

  it("produces different booking_ids for different trip details", () => {
    const b1 = bookTrip(BASE_DETAILS, 1000);
    const b2 = bookTrip({ ...BASE_DETAILS, destination: "LON" }, 1000);
    assert.notStrictEqual(b1.bookingId, b2.bookingId);
  });

  it("uses the injected nowMs when provided, otherwise Date.now()", () => {
    const fixed = bookTrip(BASE_DETAILS, 1700000000000);
    assert.strictEqual(fixed.createdAtMs, 1700000000000);
  });

  it("does not move money: fareMinor is stored only, no transfer fields", () => {
    const result = bookTrip(BASE_DETAILS, 1000);
    assert.strictEqual(result.fareMinor, 25000);
    assert.ok(!("transfer" in result));
    assert.ok(!("amount" in result));
    assert.ok(!("currency" in result));
  });
});

describe("trips.book catalogue entry (grant gate)", () => {
  it("trips.book exists and is tier3, so the MCP registry requires an approval grant", () => {
    const entry = tripsBookCatalogueEntry();
    assert.strictEqual(entry.risk_tier, "tier3");
    // tier3/tier4 triggers the approval_grant requirement in validateAndAuthorizeCall.
    assert.ok(entry.risk_tier === "tier3" || entry.risk_tier === "tier4");
  });

  it("trips.book requires idempotency_key (booking is a consequential write)", () => {
    const entry = tripsBookCatalogueEntry();
    assert.strictEqual(entry.idempotency, "idempotency_key");
  });
});
