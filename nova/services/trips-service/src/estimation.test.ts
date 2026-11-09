/**
 * Nova design system - Estimation test (task 11.14, module 11).
 * Test-first: written before estimation.ts. Confirmed failing, then passing.
 * Route and fare estimation with a provider adapter. All estimates are
 * labelled — never presented as definitive prices.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  estimateRoute,
  estimateFare,
  type Estimate,
  type RouteEstimate,
  type FareEstimate,
} from "./estimation.ts";

describe("estimateRoute", () => {
  it("returns a labelled estimate for a route", () => {
    const result = estimateRoute("New York, NY", "Boston, MA");
    assert.strictEqual(result.origin, "New York, NY");
    assert.strictEqual(result.destination, "Boston, MA");
    assert.ok(typeof result.distanceKm === "number" && result.distanceKm > 0);
    assert.ok(typeof result.durationMinutes === "number" && result.durationMinutes > 0);
    assert.ok(typeof result.estimatedFareMinor === "number" && result.estimatedFareMinor > 0);
    assert.strictEqual(result.currency, "USD");
    assert.ok(result.estimateLabel);
    assert.ok(result.estimateLabel.includes("estimate"));
  });

  it("is deterministic: same origin/destination returns same estimate", () => {
    const r1 = estimateRoute("London", "Paris");
    const r2 = estimateRoute("London", "Paris");
    assert.deepStrictEqual(r1, r2);
  });

  it("returns different estimates for different routes", () => {
    const r1 = estimateRoute("A", "B");
    const r2 = estimateRoute("A", "C");
    assert.notStrictEqual(r1.distanceKm, r2.distanceKm);
  });
});

describe("estimateFare", () => {
  it("returns an integer minor-unit fare estimate", () => {
    const result = estimateFare(100, 250); // 100 km at 250 minor units/km = 25000
    assert.strictEqual(result.amountMinor, 25000);
    assert.strictEqual(result.currency, "USD");
    assert.ok(result.estimateLabel);
    assert.ok(result.estimateLabel.includes("estimate"));
  });

  it("rounds to integer minor units", () => {
    const result = estimateFare(33, 333); // 33 * 333 = 10989
    assert.strictEqual(result.amountMinor, 10989);
    assert.ok(Number.isInteger(result.amountMinor));
  });

  it("returns zero fare for zero distance", () => {
    const result = estimateFare(0, 500);
    assert.strictEqual(result.amountMinor, 0);
  });
});
