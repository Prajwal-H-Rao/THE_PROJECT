/**
 * Nova design system - Provider config test (task 11.12, module 11).
 * Test-first: written before providers.ts. Confirmed failing, then passing.
 * Plaid or India Account Aggregator behind a config flag; flag off means CSV
 * only; credentials not stored; P9 registry reads only status.
 */

import { strict as assert } from "node:assert";
import { describe, it, beforeEach } from "node:test";
import {
  getProviderAdapter,
  isProviderEnabled,
  ProviderAdapter,
  resetProviderConfigForTest,
} from "./providers.js";

function provider(overrides: Partial<ProviderAdapter> = {}): ProviderAdapter {
  return {
    provider: "plaid",
    enabled: true,
    status: "connected",
    ...overrides,
  };
}

describe("getProviderAdapter", () => {
  beforeEach(() => {
    resetProviderConfigForTest();
  });

  it("returns adapter when provider enabled", () => {
    process.env.PLAID_ENABLED = "1";
    const adapter = getProviderAdapter("plaid");
    assert.strictEqual(adapter!.provider, "plaid");
    assert.strictEqual(adapter!.enabled, true);
  });

  it("returns null for unknown provider", () => {
    const adapter = getProviderAdapter("nonexistent");
    assert.strictEqual(adapter, null);
  });
});

describe("isProviderEnabled", () => {
  beforeEach(() => {
    resetProviderConfigForTest();
  });

  it("returns false when config flag off (CSV only)", () => {
    assert.ok(!isProviderEnabled("plaid"));
    assert.ok(!isProviderEnabled("aa"));
  });

  it("returns true when config flag on", () => {
    process.env.PLAID_ENABLED = "1";
    assert.ok(isProviderEnabled("plaid"));
    assert.ok(!isProviderEnabled("aa")); // only plaid enabled
  });
});
