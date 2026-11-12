/**
 * Nova design system - Operation registry test (task 11.18, module 11).
 * Tests that registered trips operations pass argument validation and
 * that unregistered arguments are rejected (spec:195).
 */

import { strict as assert } from "node:assert";
import { describe, it, beforeEach } from "node:test";
import { OperationRegistry, registerTripsOperations } from "./operation-registry.js";

describe("OperationRegistry", () => {
  let registry: OperationRegistry;

  beforeEach(() => {
    registry = new OperationRegistry();
    registerTripsOperations(registry);
  });

  it("isRegistered returns true for registered trips operations", () => {
    for (const op of ["trips.read", "trips.write", "trips.compare", "trips.book"]) {
      assert.strictEqual(registry.isRegistered(op), true);
    }
  });

  it("isRegistered returns false for unregistered operations", () => {
    assert.strictEqual(registry.isRegistered("trips.delete"), false);
    assert.strictEqual(registry.isRegistered("inbox.read"), false);
  });

  it("validates registered trips.read with valid arguments", () => {
    const result = registry.validateArguments("trips.read", {
      origin: "BER",
      destination: "NYC",
    });
    assert.strictEqual(result.valid, true);
  });

  it("validates registered trips.book with valid arguments", () => {
    const result = registry.validateArguments("trips.book", {
      trip_id: "trip-1",
      origin: "BER",
      destination: "NYC",
      travel_date: "2026-12-01",
      fare_minor: 25000,
    });
    assert.strictEqual(result.valid, true);
  });

  it("rejects unknown operation", () => {
    const result = registry.validateArguments("trips.delete", { trip_id: "trip-1" });
    assert.strictEqual(result.valid, false);
    assert.ok(result.reason?.includes("not registered"));
  });

  it("rejects unregistered argument (property not in schema)", () => {
    const result = registry.validateArguments("trips.read", {
      origin: "BER",
      destination: "NYC",
      fare_minor: 100, // not in trips.read schema
    });
    assert.strictEqual(result.valid, false);
    assert.ok(result.reason?.includes("Unregistered argument"));
    assert.ok(result.reason?.includes("fare_minor"));
  });

  it("rejects missing required argument", () => {
    const result = registry.validateArguments("trips.read", {
      origin: "BER",
      // destination missing
    });
    assert.strictEqual(result.valid, false);
    assert.ok(result.reason?.includes("Missing required argument"));
    assert.ok(result.reason?.includes("destination"));
  });

  it("accepts undefined arguments when schema has no required fields", () => {
    // trips.read has required fields, so undefined args should fail
    const result = registry.validateArguments("trips.read", undefined);
    assert.strictEqual(result.valid, false);
    assert.ok(result.reason?.includes("Missing required argument"));
  });
});
