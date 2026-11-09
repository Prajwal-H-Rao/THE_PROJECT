/**
 * Contract test for CalendarAdapter: list, get, create, update, delete events.
 * Verifies the adapter contract matches the mock implementation.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { createMockCalendarAdapter } from "./calendar-adapter.js";

describe("CalendarAdapter contract", () => {
  it("list returns events and total", async () => {
    const adapter = createMockCalendarAdapter({ userId: "user-1" });
    adapter.addEvent({
      eventId: "evt-1",
      userId: "user-1",
      title: "Team meeting",
      description: "Weekly sync",
      startAt: "2026-10-01T10:00:00Z",
      endAt: "2026-10-01T11:00:00Z",
      status: "confirmed",
      attendees: ["bob@example.com"],
      recurrenceRule: null,
      createdAt: "2026-10-01T09:00:00Z",
      updatedAt: "2026-10-01T09:00:00Z",
    });

    const result = await adapter.list("user-1", "", 10);

    assert.ok(Array.isArray(result.events));
    assert.strictEqual(result.events.length, 1);
    assert.strictEqual(result.total, 1);
    assert.strictEqual(result.events[0].eventId, "evt-1");
    assert.strictEqual(result.events[0].title, "Team meeting");
  });

  it("get returns one event by id", async () => {
    const adapter = createMockCalendarAdapter({ userId: "user-1" });
    adapter.addEvent({
      eventId: "evt-2",
      userId: "user-1",
      title: "Lunch",
      description: "Business lunch",
      startAt: "2026-10-02T12:00:00Z",
      endAt: "2026-10-02T13:00:00Z",
      status: "confirmed",
      attendees: ["carol@example.com"],
      recurrenceRule: null,
      createdAt: "2026-10-02T11:00:00Z",
      updatedAt: "2026-10-02T11:00:00Z",
    });

    const result = await adapter.get("user-1", "evt-2");

    assert.strictEqual(result.eventId, "evt-2");
    assert.strictEqual(result.title, "Lunch");
  });

  it("get throws when event not found", async () => {
    const adapter = createMockCalendarAdapter({ userId: "user-1" });

    await assert.rejects(() => adapter.get("user-1", "missing"), /Event not found/);
  });

  it("create creates an event and returns it", async () => {
    const adapter = createMockCalendarAdapter({ userId: "user-1" });

    const result = await adapter.create("user-1", {
      userId: "user-1",
      title: "Workshop",
      description: "Hands-on session",
      startAt: "2026-10-03T14:00:00Z",
      endAt: "2026-10-03T16:00:00Z",
      attendees: ["dave@example.com"],
    });

    assert.ok(result.eventId);
    assert.strictEqual(typeof result.eventId, "string");
    assert.ok(result.eventId.startsWith("evt-"));
    assert.strictEqual(result.title, "Workshop");
    assert.strictEqual(result.description, "Hands-on session");

    const event = adapter.getEvent(result.eventId);
    assert.ok(event);
    assert.strictEqual(event.title, "Workshop");
    assert.strictEqual(event.attendees.length, 1);
    assert.strictEqual(event.attendees[0], "dave@example.com");
  });

  it("update modifies an existing event", async () => {
    const adapter = createMockCalendarAdapter({ userId: "user-1" });
    adapter.addEvent({
      eventId: "evt-3",
      userId: "user-1",
      title: "Old title",
      description: "Old description",
      startAt: "2026-10-04T09:00:00Z",
      endAt: "2026-10-04T10:00:00Z",
      status: "confirmed",
      attendees: [],
      recurrenceRule: null,
      createdAt: "2026-10-04T08:00:00Z",
      updatedAt: "2026-10-04T08:00:00Z",
    });

    const result = await adapter.update("user-1", {
      eventId: "evt-3",
      userId: "user-1",
      title: "New title",
    });

    assert.strictEqual(result.title, "New title");
    assert.strictEqual(result.description, "Old description");

    const updatedEvent = adapter.getEvent("evt-3");
    assert.ok(updatedEvent);
    assert.notStrictEqual(updatedEvent!.updatedAt, "2026-10-04T08:00:00Z");
  });

  it("update throws when event not found", async () => {
    const adapter = createMockCalendarAdapter({ userId: "user-1" });

    await assert.rejects(
      () => adapter.update("user-1", { eventId: "missing", title: "New", userId: "user-1" }),
      /Event not found/
    );
  });

  it("delete removes an event", async () => {
    const adapter = createMockCalendarAdapter({ userId: "user-1" });
    adapter.addEvent({
      eventId: "evt-4",
      userId: "user-1",
      title: "To delete",
      description: null,
      startAt: "2026-10-05T09:00:00Z",
      endAt: "2026-10-05T10:00:00Z",
      status: "confirmed",
      attendees: [],
      recurrenceRule: null,
      createdAt: "2026-10-05T08:00:00Z",
      updatedAt: "2026-10-05T08:00:00Z",
    });

    await adapter.delete("user-1", "evt-4");

    const event = adapter.getEvent("evt-4");
    assert.strictEqual(event, null);
  });

  it("delete throws when event not found", async () => {
    const adapter = createMockCalendarAdapter({ userId: "user-1" });

    await assert.rejects(() => adapter.delete("user-1", "missing"), /Event not found/);
  });
});
