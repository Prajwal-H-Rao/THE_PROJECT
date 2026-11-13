/** Tests for the manual handoff module (task 12.17). */

import assert from "node:assert/strict";
import { test } from "node:test";
import { buildHandoff, mustHandOff, isEvasion } from "./handoff.js";

test("buildHandoff returns a handoff result", () => {
  const result = buildHandoff("https://example.com/careers/job-1", "Dear hiring manager...", "403 blocked");
  assert.equal(result.handoff, true);
  assert.equal(result.officialUrl, "https://example.com/careers/job-1");
  assert.equal(result.content, "Dear hiring manager...");
  assert.equal(result.reason, "403 blocked");
});

test("mustHandOff is true for 403, 429, 5xx", () => {
  assert.equal(mustHandOff(403), true);
  assert.equal(mustHandOff(429), true);
  assert.equal(mustHandOff(500), true);
  assert.equal(mustHandOff(503), true);
});

test("mustHandOff is false for 200, 201, 400", () => {
  assert.equal(mustHandOff(200), false);
  assert.equal(mustHandOff(201), false);
  assert.equal(mustHandOff(400), false);
});

test("isEvasion detects retry/bypass/evade language", () => {
  assert.equal(isEvasion("retry with different method"), true);
  assert.equal(isEvasion("bypass CAPTCHA"), true);
  assert.equal(isEvasion("evade bot controls"), true);
  assert.equal(isEvasion("manual handoff"), false);
});
