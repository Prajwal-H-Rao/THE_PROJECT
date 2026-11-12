/**
 * Nova trips service - Pre-departure checklist test (task 11.15, module 11).
 * Test-first: written before checklist.ts. Confirmed failing, then passing.
 * The checklist is deterministic — the task's named test. Offsets are civil
 * calendar arithmetic, so DST cannot shift a due date (spec:826).
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { buildPreDepartureChecklist } from "./checklist.ts";
import { BASE_TRIP } from "./fixtures.ts";
import type { TripPlan } from "./types.ts";

describe("buildPreDepartureChecklist", () => {
  it("is deterministic: same trip returns the same checklist", () => {
    assert.deepStrictEqual(
      buildPreDepartureChecklist(BASE_TRIP),
      buildPreDepartureChecklist(BASE_TRIP),
    );
  });

  it("assigns every item a phase and a due date", () => {
    for (const item of buildPreDepartureChecklist(BASE_TRIP)) {
      assert.ok(
        item.phase === "weeks-before" ||
          item.phase === "days-before" ||
          item.phase === "day-of",
      );
      assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(item.dueDate));
      assert.strictEqual(item.done, false);
    }
  });

  it("sorts items by due date, earliest first", () => {
    const due = buildPreDepartureChecklist(BASE_TRIP).map((i) => i.dueDate);
    const sorted = [...due].sort();
    assert.deepStrictEqual(due, sorted);
  });

  it("computes offsets in civil days, surviving DST (spec:826)", () => {
    // startAt is 2026-11-01 local in America/New_York (23:30 EST).
    // Civil subtraction of 7 days gives 2026-10-25. Epoch-ms subtraction
    // would cross the fall-back hour and give 2026-10-26.
    const trip: TripPlan = {
      ...BASE_TRIP,
      startAt: "2026-11-02T04:30:00Z",
      timezone: "America/New_York",
    };
    const week = buildPreDepartureChecklist(trip).find(
      (i) => i.phase === "weeks-before" && i.offsetDays === 7,
    );
    assert.ok(week);
    assert.strictEqual(week.dueDate, "2026-10-25");
  });
});
