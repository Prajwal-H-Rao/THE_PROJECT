/**
 * Tests for recurrence parser - RRULE string parsing and validation.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { parseRule, isValidRule } from "./recurrence-parser.js";

describe("recurrence-parser", () => {
  it("parses simple DAILY rule", () => {
    const result = parseRule("FREQ=DAILY;INTERVAL=1");
    assert.ok("code" in result === false);
    const parsed = result as { freq: string; interval: number };
    assert.strictEqual(parsed.freq, "DAILY");
    assert.strictEqual(parsed.interval, 1);
  });

  it("parses WEEKLY rule with BYDAY", () => {
    const result = parseRule("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,FR");
    assert.ok("code" in result === false);
    const parsed = result as { freq: string; interval: number; byday: readonly string[] };
    assert.strictEqual(parsed.freq, "WEEKLY");
    assert.strictEqual(parsed.interval, 2);
    assert.deepStrictEqual(parsed.byday, ["MO", "WE", "FR"]);
  });

  it("parses MONTHLY rule with BYMONTHDAY", () => {
    const result = parseRule("FREQ=MONTHLY;BYMONTHDAY=1,15");
    assert.ok("code" in result === false);
    const parsed = result as { freq: string; bymonthday: readonly number[] };
    assert.strictEqual(parsed.freq, "MONTHLY");
    assert.deepStrictEqual(parsed.bymonthday, [1, 15]);
  });

  it("parses YEARLY rule with UNTIL and COUNT", () => {
    const result = parseRule("FREQ=YEARLY;INTERVAL=1;UNTIL=20251231;COUNT=5");
    assert.ok("code" in result === false);
    const parsed = result as { freq: string; until: string | null; count: number | null };
    assert.strictEqual(parsed.freq, "YEARLY");
    assert.strictEqual(parsed.until, "20251231");
    assert.strictEqual(parsed.count, 5);
  });

  it("rejects empty rule", () => {
    const result = parseRule("");
    assert.ok("code" in result);
    const error = result as { code: string };
    assert.strictEqual(error.code, "empty_rule");
  });

  it("rejects invalid FREQ", () => {
    const result = parseRule("FREQ=HOURLY");
    assert.ok("code" in result);
    const error = result as { code: string };
    assert.strictEqual(error.code, "invalid_freq");
  });

  it("rejects missing FREQ", () => {
    const result = parseRule("INTERVAL=1");
    assert.ok("code" in result);
    const error = result as { code: string };
    assert.strictEqual(error.code, "invalid_freq");
  });

  it("isValidRule returns true for valid rule", () => {
    assert.strictEqual(isValidRule("FREQ=DAILY;INTERVAL=1"), true);
  });

  it("isValidRule returns false for invalid rule", () => {
    assert.strictEqual(isValidRule("FREQ=HOURLY"), false);
  });
});
