/** Tests for the follow-up state machine (task 12.16). */

import assert from "node:assert/strict";
import { test } from "node:test";
import { transitionState, canTransition, legalTargets, type FollowUpState } from "./followup.js";

test("applied to assessment is legal", () => {
  assert.equal(transitionState("applied", "assessment"), "assessment");
});

test("assessment to interview is legal", () => {
  assert.equal(transitionState("assessment", "interview"), "interview");
});

test("rejected to interview is illegal", () => {
  assert.throws(() => transitionState("rejected", "interview"), /Illegal follow-up transition/);
});

test("withdrawn to applied is illegal", () => {
  assert.throws(() => transitionState("withdrawn", "applied"), /Illegal follow-up transition/);
});

test("rejected has no legal targets", () => {
  assert.equal(legalTargets("rejected").length, 0);
});

test("unknown can transition to applied", () => {
  assert.equal(canTransition("unknown", "applied"), true);
  assert.equal(canTransition("unknown", "rejected"), true);
  assert.equal(canTransition("unknown", "interview"), false);
});

test("canTransition returns false for illegal transitions", () => {
  assert.equal(canTransition("rejected", "interview"), false);
  assert.equal(canTransition("applied", "applied"), false);
});

test("legalTargets returns the correct set for applied", () => {
  const targets = legalTargets("applied");
  assert.ok(targets.includes("assessment"));
  assert.ok(targets.includes("rejected"));
  assert.ok(targets.includes("withdrawn"));
  assert.equal(targets.length, 3);
});

test("all six states are valid FollowUpState values", () => {
  const states: FollowUpState[] = ["applied", "assessment", "interview", "rejected", "withdrawn", "unknown"];
  for (const s of states) {
    assert.ok(canTransition(s, s) === false || legalTargets(s).length >= 0);
  }
});
