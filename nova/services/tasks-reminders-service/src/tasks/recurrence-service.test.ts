/**
 * Tests for recurrence service - next occurrence generation.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { parseRule } from "./recurrence-parser.js";
import { nextOccurrence } from "./recurrence-service.js";

describe("recurrence-service", () => {
  it("computes next daily occurrence", () => {
    const rule = parseRule("FREQ=DAILY;INTERVAL=1");
    if ("code" in rule) {
      assert.fail(`Expected valid rule, got: ${rule.code}`);
    }
    const result = nextOccurrence(rule, "2026-10-01T10:00:00Z", "UTC");
    if ("code" in result) {
      assert.fail(`Expected occurrence, got: ${result.code}`);
    }
    assert.strictEqual(result.nextOccurrence, "2026-10-02T10:00:00.000Z");
  });

  it("computes next weekly occurrence", () => {
    const rule = parseRule("FREQ=WEEKLY;INTERVAL=1");
    if ("code" in rule) {
      assert.fail(`Expected valid rule, got: ${rule.code}`);
    }
    const result = nextOccurrence(rule, "2026-10-01T10:00:00Z", "UTC");
    if ("code" in result) {
      assert.fail(`Expected occurrence, got: ${result.code}`);
    }
    assert.strictEqual(result.nextOccurrence, "2026-10-08T10:00:00.000Z");
  });

  it("computes next monthly occurrence", () => {
    const rule = parseRule("FREQ=MONTHLY;INTERVAL=1");
    if ("code" in rule) {
      assert.fail(`Expected valid rule, got: ${rule.code}`);
    }
    const result = nextOccurrence(rule, "2026-10-01T10:00:00Z", "UTC");
    if ("code" in result) {
      assert.fail(`Expected occurrence, got: ${result.code}`);
    }
    assert.strictEqual(result.nextOccurrence, "2026-11-01T10:00:00.000Z");
  });

  it("computes next yearly occurrence", () => {
    const rule = parseRule("FREQ=YEARLY;INTERVAL=1");
    if ("code" in rule) {
      assert.fail(`Expected valid rule, got: ${rule.code}`);
    }
    const result = nextOccurrence(rule, "2026-10-01T10:00:00Z", "UTC");
    if ("code" in result) {
      assert.fail(`Expected occurrence, got: ${result.code}`);
    }
    assert.strictEqual(result.nextOccurrence, "2027-10-01T10:00:00.000Z");
  });

  it("enforces COUNT bound", () => {
    const rule = parseRule("FREQ=DAILY;INTERVAL=1;COUNT=2");
    if ("code" in rule) {
      assert.fail(`Expected valid rule, got: ${rule.code}`);
    }
    const first = nextOccurrence(rule, "2026-10-01T10:00:00Z", "UTC", 0);
    if ("code" in first) {
      assert.fail(`Expected occurrence, got: ${first.code}`);
    }
    assert.strictEqual(first.remainingCount, 1);

    const second = nextOccurrence(rule, "2026-10-02T10:00:00Z", "UTC", 1);
    if ("code" in second) {
      assert.fail(`Expected occurrence, got: ${second.code}`);
    }
    assert.strictEqual(second.remainingCount, 0);

    const third = nextOccurrence(rule, "2026-10-03T10:00:00Z", "UTC", 2);
    assert.ok("code" in third);
    const error = third as { code: string };
    assert.strictEqual(error.code, "count_exhausted");
  });

  it("enforces UNTIL bound", () => {
    const rule = parseRule("FREQ=DAILY;INTERVAL=1;UNTIL=2026-10-04");
    if ("code" in rule) {
      assert.fail(`Expected valid rule, got: ${rule.code}`);
    }
    const first = nextOccurrence(rule, "2026-10-01T10:00:00Z", "UTC");
    if ("code" in first) {
      assert.fail(`Expected occurrence, got: ${first.code}`);
    }
    assert.strictEqual(first.nextOccurrence, "2026-10-02T10:00:00.000Z");

    const second = nextOccurrence(rule, "2026-10-02T10:00:00Z", "UTC", 1);
    if ("code" in second) {
      assert.fail(`Expected occurrence, got: ${second.code}`);
    }
    assert.strictEqual(second.nextOccurrence, "2026-10-03T10:00:00.000Z");

    const third = nextOccurrence(rule, "2026-10-03T10:00:00Z", "UTC", 2);
    if ("code" in third) {
      assert.fail(`Expected occurrence, got: ${third.code}`);
    }
    assert.strictEqual(third.nextOccurrence, "2026-10-04T10:00:00.000Z");

    const fourth = nextOccurrence(rule, "2026-10-04T10:00:00Z", "UTC", 3);
    assert.ok("code" in fourth);
    const error = fourth as { code: string };
    assert.strictEqual(error.code, "until_expired");
  });

  it("computes occurrence with BYDAY filter", () => {
    const rule = parseRule("FREQ=WEEKLY;INTERVAL=1;BYDAY=MO");
    if ("code" in rule) {
      assert.fail(`Expected valid rule, got: ${rule.code}`);
    }
    // 2026-10-05 is a Monday. Next Monday is 2026-10-12.
    const result = nextOccurrence(rule, "2026-10-05T10:00:00Z", "UTC");
    if ("code" in result) {
      assert.fail(`Expected occurrence, got: ${result.code}`);
    }
    assert.strictEqual(result.nextOccurrence, "2026-10-12T10:00:00.000Z");
  });

  it("rejects invalid start date", () => {
    const rule = parseRule("FREQ=DAILY;INTERVAL=1");
    if ("code" in rule) {
      assert.fail(`Expected valid rule, got: ${rule.code}`);
    }
    const result = nextOccurrence(rule, "not-a-date", "UTC");
    assert.ok("code" in result);
    const error = result as { code: string };
    assert.strictEqual(error.code, "invalid_start_date");
  });

  it("maps spring-forward gap forward to first valid instant", () => {
    const rule = parseRule("FREQ=DAILY;INTERVAL=1");
    if ("code" in rule) {
      assert.fail(`Expected valid rule, got: ${rule.code}`);
    }
    // 2026-03-07 02:30 AM EST → add 1 day → 2026-03-08 02:30 AM local does not exist
    // (spring forward 2:00→3:00). Maps forward to 03:00 AM EDT.
    const result = nextOccurrence(rule, "2026-03-07T07:30:00Z", "America/New_York");
    if ("code" in result) {
      assert.fail(`Expected occurrence, got: ${result.code}`);
    }
    assert.strictEqual(result.nextOccurrence, "2026-03-08T07:00:00.000Z");
  });

  it("maps fall-back ambiguity to earliest UTC instant", () => {
    const rule = parseRule("FREQ=DAILY;INTERVAL=1");
    if ("code" in rule) {
      assert.fail(`Expected valid rule, got: ${rule.code}`);
    }
    // 2026-10-31 01:30 AM EDT → add 1 day → 2026-11-01 01:30 AM local (ambiguous)
    // Earliest UTC instant: 01:30 AM EDT = 05:30Z.
    const result = nextOccurrence(rule, "2026-10-31T05:30:00Z", "America/New_York");
    if ("code" in result) {
      assert.fail(`Expected occurrence, got: ${result.code}`);
    }
    assert.strictEqual(result.nextOccurrence, "2026-11-01T05:30:00.000Z");
  });

  it("rejects invalid timezone", () => {
    const rule = parseRule("FREQ=DAILY;INTERVAL=1");
    if ("code" in rule) {
      assert.fail(`Expected valid rule, got: ${rule.code}`);
    }
    const result = nextOccurrence(rule, "2026-10-01T10:00:00Z", "Not/AZone");
    assert.ok("code" in result);
    const error = result as { code: string };
    assert.strictEqual(error.code, "invalid_timezone");
  });
});
