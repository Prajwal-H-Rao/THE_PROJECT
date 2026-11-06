/**
 * Tests for the spec:562 registry lifecycle state machine.
 * Enumerates the full 12x12 transition matrix: every legal pair resolves,
 * every unlisted pair throws — including source_changed → polling, which
 * would bypass forced re-verification (spec:558).
 */

import { test } from "node:test";
import { strictEqual, throws, doesNotThrow } from "node:assert";
import { transition, LEGAL_TRANSITIONS, PIPELINE_STATES, HEALTH_STATES } from "./lifecycle.js";

// All 12 lifecycle states, pipeline first.
const ALL_STATES: readonly string[] = [...PIPELINE_STATES, ...HEALTH_STATES];

// Count the legal edges declared in the map.
const LEGAL_EDGE_COUNT: number = [...LEGAL_TRANSITIONS.values()].reduce(
  (sum, targets) => sum + targets.length,
  0,
);

test("declares exactly 17 legal edges", () => {
  // 5 pipeline steps + 6 polling→health + 3 recovery + 2 user resume + 1 re-verify.
  strictEqual(LEGAL_EDGE_COUNT, 17);
});

test("every legal transition in the map resolves", () => {
  for (const [current, targets] of LEGAL_TRANSITIONS) {
    for (const target of targets) {
      doesNotThrow(
        () => transition(current, target),
        `"${current}" → "${target}" must be legal`,
      );
    }
  }
});

test("every unlisted pair throws (full 12x12 matrix)", () => {
  for (const current of ALL_STATES) {
    for (const target of ALL_STATES) {
      const allowed: readonly string[] = LEGAL_TRANSITIONS.get(current) ?? [];
      if (allowed.includes(target)) {
        continue;
      }
      throws(
        () => transition(current, target),
        `"${current}" → "${target}" must be illegal`,
      );
    }
  }
});

test("source_changed can never reach polling directly", () => {
  // The critical re-verification edge (spec:558).
  throws(() => transition("source_changed", "polling"));
  strictEqual(transition("source_changed", "career_url_verified"), "career_url_verified");
});

test("pipeline skips and backward moves throw", () => {
  throws(() => transition("seeded", "polling"));
  throws(() => transition("seeded", "healthy"));
  throws(() => transition("career_url_verified", "connector_configured"));
  throws(() => transition("polling", "seeded"));
});

test("unknown states throw", () => {
  throws(() => transition("unknown", "seeded"));
  throws(() => transition("seeded", "unknown"));
});
