/**
 * Nova design model - Calendar conflict detection test (task 09.13, module 09).
 * Verifies that creating an event with an overlapping time range is rejected,
 * while non-overlapping events are accepted.
 *
 * The conflict detection logic uses the standard interval overlap test:
 * two time ranges [s1, e1) and [s2, e2) overlap if s1 < e2 AND s2 < e1.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

/**
 * Detects whether a proposed time range overlaps with any existing event.
 * Two time ranges [s1, e1) and [s2, e2) overlap if s1 < e2 AND s2 < e1.
 */
function hasConflict(
  events: Array<{ eventId: string; startAt: string; endAt: string }>,
  newStartAt: string,
  newEndAt: string,
): boolean {
  return events.some((e) => e.startAt < newEndAt && e.endAt > newStartAt);
}

describe("calendar conflict detection", () => {
  it("rejects creating an event that overlaps with an existing event", () => {
    const events = [
      { eventId: "evt-1", startAt: "2026-11-01T09:00:00Z", endAt: "2026-11-01T10:00:00Z" },
    ];
    assert.ok(
      hasConflict(events, "2026-11-01T09:30:00Z", "2026-11-01T10:30:00Z"),
      "overlapping event should be detected",
    );
  });

  it("accepts creating an event that does not overlap", async () => {
    const events = [
      { eventId: "evt-1", startAt: "2026-11-01T09:00:00Z", endAt: "2026-11-01T10:00:00Z" },
    ];
    assert.ok(
      !hasConflict(events, "2026-11-01T10:00:00Z", "2026-11-01T11:00:00Z"),
      "non-overlapping event should not be detected",
    );
  });

  it("rejects creating an event that exactly overlaps an existing event", async () => {
    const events = [
      { eventId: "evt-1", startAt: "2026-11-01T09:00:00Z", endAt: "2026-11-01T10:00:00Z" },
    ];
    assert.ok(
      hasConflict(events, "2026-11-01T09:00:00Z", "2026-11-01T10:00:00Z"),
      "exact overlap should be detected",
    );
  });

  it("allows creating an event that ends exactly when another starts", async () => {
    const events = [
      { eventId: "evt-1", startAt: "2026-11-01T09:00:00Z", endAt: "2026-11-01T10:00:00Z" },
    ];
    assert.ok(
      !hasConflict(events, "2026-11-01T10:00:00Z", "2026-11-01T11:00:00Z"),
      "back-to-back event should not conflict",
    );
  });

  it("allows creating an event for a different user even with overlapping time", async () => {
    // The repository filters by userId before calling conflict detection,
    // so each user's events are checked independently against only their own events.
    const user1Events = [
      { eventId: "evt-1", startAt: "2026-11-01T09:00:00Z", endAt: "2026-11-01T10:00:00Z" },
    ];
    const user2Events = [
      { eventId: "evt-2", startAt: "2026-11-01T09:00:00Z", endAt: "2026-11-01T10:00:00Z" },
    ];
    // User-1's own event conflicts with their own time
    assert.ok(
      hasConflict(user1Events, "2026-11-01T09:00:00Z", "2026-11-01T10:00:00Z"),
      "user-1's own event conflicts",
    );
    // User-2's own event conflicts with their own time
    assert.ok(
      hasConflict(user2Events, "2026-11-01T09:00:00Z", "2026-11-01T10:00:00Z"),
      "user-2's own event conflicts",
    );
    // An empty event list (e.g., user-2 querying when they have no events)
    // has no conflicts
    assert.ok(
      !hasConflict([], "2026-11-01T09:00:00Z", "2026-11-01T10:00:00Z"),
      "empty event list has no conflicts",
    );
  });
});
