/**
 * Nova trips service - Packing list test (task 11.15, module 11).
 * Test-first: written before packing.ts. Confirmed failing, then passing.
 * The packing list is deterministic: same input gives the same list.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { buildPackingList } from "./packing.ts";
import { BASE_TRIP } from "./fixtures.ts";
import type { TripPlan } from "./types.ts";

describe("buildPackingList", () => {
  it("is deterministic: same trip returns the same list", () => {
    assert.deepStrictEqual(
      buildPackingList(BASE_TRIP),
      buildPackingList(BASE_TRIP),
    );
  });

  it("always carries the base items", () => {
    const names = buildPackingList(BASE_TRIP).map((i) => i.name);
    for (const base of ["passport", "phone charger", "toiletry kit"]) {
      assert.ok(names.includes(base));
    }
  });

  it("scales quantities with the day count up to fixed caps", () => {
    const short = buildPackingList(BASE_TRIP); // 3 days
    const shirts = short.find((i) => i.name === "shirts");
    assert.ok(shirts);
    assert.strictEqual(shirts.quantity, 3);

    const longTrip: TripPlan = {
      ...BASE_TRIP,
      startAt: "2026-01-01T00:00:00Z",
      endAt: "2026-01-31T00:00:00Z",
    };
    const capped = buildPackingList(longTrip); // 31 days
    const cappedShirts = capped.find((i) => i.name === "shirts");
    assert.ok(cappedShirts);
    assert.strictEqual(cappedShirts.quantity, 7); // fixed cap
  });
});
