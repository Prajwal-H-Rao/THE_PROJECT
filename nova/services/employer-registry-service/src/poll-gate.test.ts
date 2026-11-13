/**
 * Tests for the verified_permitted poll gate (plan task 6).
 * Proves "Unverified source is never polled": every pre-permission,
 * user-action and re-verification state refuses; only the derived
 * pollable set passes.
 */

import { test } from "node:test";
import { strictEqual, throws, doesNotThrow } from "node:assert";
import { canPoll, guardPoll, POLLABLE_STATES } from "./poll-gate.js";
import { PIPELINE_STATES, HEALTH_STATES } from "./lifecycle.js";

// States the gate must refuse, with the reason class per state.
const REFUSAL_STATES: readonly string[] = [
  "needs_verification", // production start state of all 500 seed rows
  "seeded",
  "identity_verified",
  "career_url_verified",
  "source_permission_reviewed",
  "source_changed",
  "manual_only",
  "paused",
  "totally-unknown-state",
];

// States the derived set must contain.
const EXPECTED_POLLABLE: readonly string[] = [
  "connector_configured",
  "polling",
  "healthy",
  "no_openings",
  "rate_limited",
];

test("derived pollable set is exactly the 5 expected states", () => {
  strictEqual(POLLABLE_STATES.size, EXPECTED_POLLABLE.length);
  for (const state of EXPECTED_POLLABLE) {
    strictEqual(POLLABLE_STATES.has(state), true, `${state} must be pollable`);
  }
});

test("unverified and user-action states refuse (never polled)", () => {
  for (const state of REFUSAL_STATES) {
    strictEqual(canPoll(state), false, `${state} must refuse`);
    throws(() => guardPoll(state), `${state} must throw`);
  }
});

test("pollable states pass the gate and the guard", () => {
  for (const state of EXPECTED_POLLABLE) {
    strictEqual(canPoll(state), true, `${state} must pass`);
    doesNotThrow(() => guardPoll(state));
  }
});

test("every pollable state is a lifecycle state", () => {
  const lifecycleStates: ReadonlySet<string> = new Set([
    ...PIPELINE_STATES,
    ...HEALTH_STATES,
  ]);
  for (const state of POLLABLE_STATES) {
    strictEqual(lifecycleStates.has(state), true, `${state} must be a lifecycle state`);
  }
});
