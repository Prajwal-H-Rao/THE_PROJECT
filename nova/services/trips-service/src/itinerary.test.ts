/**
 * Nova trips service - Itinerary test (task 11.15, module 11).
 * Test-first: written before itinerary.ts. Confirmed failing, then passing.
 * Itinerary draft, packing list and pre-departure checklist. All three are
 * deterministic: same input gives the same output. Draft times carry an
 * estimate label (spec:411). Day math is civil calendar arithmetic in the
 * trip timezone — never epoch-ms stepping of instants.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { draftItinerary } from "./itinerary.ts";
import { BASE_TRIP } from "./fixtures.ts";
import type { TripPlan } from "./types.ts";

describe("draftItinerary", () => {
  it("is deterministic: same trip returns the same draft", () => {
    assert.deepStrictEqual(draftItinerary(BASE_TRIP), draftItinerary(BASE_TRIP));
  });

  it("labels every day entry as an estimate (spec:411)", () => {
    for (const day of draftItinerary(BASE_TRIP)) {
      assert.ok(day.estimateLabel.includes("estimate"));
    }
  });

  it("marks arrival on the first day and departure on the last day", () => {
    const days = draftItinerary(BASE_TRIP);
    assert.strictEqual(days.length, 3);
    assert.ok(days[0].marks.includes("arrival"));
    assert.ok(days[days.length - 1].marks.includes("departure"));
  });

  it("gives a one-day trip a single entry with both marks", () => {
    const trip: TripPlan = {
      ...BASE_TRIP,
      startAt: "2026-03-10T09:00:00Z",
      endAt: "2026-03-10T18:00:00Z",
    };
    const days = draftItinerary(trip);
    assert.strictEqual(days.length, 1);
    assert.ok(days[0].marks.includes("arrival"));
    assert.ok(days[0].marks.includes("departure"));
  });

  it("clamps endAt <= startAt to one day with both marks", () => {
    const trip: TripPlan = {
      ...BASE_TRIP,
      startAt: "2026-03-10T09:00:00Z",
      endAt: "2026-03-10T08:00:00Z",
    };
    const days = draftItinerary(trip);
    assert.strictEqual(days.length, 1);
    assert.ok(days[0].marks.includes("arrival"));
    assert.ok(days[0].marks.includes("departure"));
  });

  it("counts calendar days in the trip timezone, not UTC", () => {
    // 2026-01-01T15:00Z is Jan 1 in UTC but 20:30 IST on Jan 1;
    // 2026-01-01T20:00Z is still Jan 1 in UTC but 01:30 IST on Jan 2.
    // A UTC-bucketed implementation would wrongly return one day.
    const trip: TripPlan = {
      ...BASE_TRIP,
      startAt: "2026-01-01T15:00:00Z",
      endAt: "2026-01-01T20:00:00Z",
      timezone: "Asia/Kolkata",
    };
    const days = draftItinerary(trip);
    assert.deepStrictEqual(
      days.map((d) => d.date),
      ["2026-01-01", "2026-01-02"],
    );
  });

  it("survives a DST fall-back: keeps the departure day", () => {
    // America/New_York falls back on 2026-11-01. Epoch-24h stepping drops
    // the last local day; civil arithmetic keeps all four days.
    const trip: TripPlan = {
      ...BASE_TRIP,
      startAt: "2026-11-01T03:30:00Z", // 2026-10-31 23:30 EDT
      endAt: "2026-11-03T05:00:00Z", // 2026-11-03 00:00 EST
      timezone: "America/New_York",
    };
    const days = draftItinerary(trip);
    assert.deepStrictEqual(
      days.map((d) => d.date),
      ["2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03"],
    );
  });

  it("survives a DST spring-forward: keeps the skipped-clock day", () => {
    // America/New_York springs forward on 2026-03-08. The local day exists
    // even though one wall-clock hour vanishes.
    const trip: TripPlan = {
      ...BASE_TRIP,
      startAt: "2026-03-08T04:30:00Z", // 2026-03-07 23:30 EST
      endAt: "2026-03-09T05:00:00Z", // 2026-03-09 01:00 EDT
      timezone: "America/New_York",
    };
    const days = draftItinerary(trip);
    assert.deepStrictEqual(
      days.map((d) => d.date),
      ["2026-03-07", "2026-03-08", "2026-03-09"],
    );
  });

  it("falls back to UTC for an invalid timezone, deterministically", () => {
    const bad: TripPlan = { ...BASE_TRIP, timezone: "Mars/Phobos" };
    const good: TripPlan = { ...BASE_TRIP, timezone: "UTC" };
    assert.deepStrictEqual(draftItinerary(bad), draftItinerary(good));
  });

  it("rejects an offset-less ISO string with a deterministic RangeError", () => {
    const trip: TripPlan = { ...BASE_TRIP, startAt: "2026-03-10T09:00" };
    assert.throws(() => draftItinerary(trip), RangeError);
  });

  it("accepts a Date instance and an epoch-ms number", () => {
    const fromNumber = draftItinerary({
      ...BASE_TRIP,
      startAt: Date.parse("2026-03-10T09:00:00Z"),
      endAt: Date.parse("2026-03-12T18:00:00Z"),
    });
    const fromDate = draftItinerary({
      ...BASE_TRIP,
      startAt: new Date("2026-03-10T09:00:00Z"),
      endAt: new Date("2026-03-12T18:00:00Z"),
    });
    assert.deepStrictEqual(fromNumber, fromDate);
    assert.deepStrictEqual(fromNumber, draftItinerary(BASE_TRIP));
  });

  it("rejects a trip longer than the maximum duration", () => {
    const trip: TripPlan = {
      ...BASE_TRIP,
      startAt: "2026-01-01T00:00:00Z",
      endAt: "2027-06-01T00:00:00Z",
    };
    assert.throws(() => draftItinerary(trip), RangeError);
  });
});
