/**
 * Nova design model - ICS import/export test (task 09.14, module 09).
 * Verifies round-trip: export CalendarEvent[] to ICS text, import back,
 * and confirm all fields are preserved.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { exportICS, importICS } from "./ics.ts";
import type { CalendarEvent } from "./ics.ts";

const testEvent: CalendarEvent = {
  eventId: "evt-123",
  userId: "user-1",
  title: "Team Meeting",
  description: "Weekly sync with the team",
  startAt: "2026-11-01T09:00:00Z",
  endAt: "2026-11-01T10:00:00Z",
  status: "confirmed",
  attendees: ["alice@example.com", "bob@example.com"],
  recurrenceRule: "FREQ=WEEKLY;COUNT=10",
  createdAt: "2026-10-25T08:00:00Z",
  updatedAt: "2026-10-25T08:00:00Z",
};

describe("ICS import/export round-trip", () => {
  it("exports an event to ICS text", () => {
    const ics = exportICS([testEvent]);

    assert.ok(ics.startsWith("BEGIN:VCALENDAR"), "starts with VCALENDAR");
    assert.ok(ics.endsWith("END:VCALENDAR"), "ends with VCALENDAR");
    assert.ok(ics.includes("BEGIN:VEVENT"), "contains VEVENT");
    assert.ok(ics.includes("UID:evt-123"), "contains UID");
    assert.ok(ics.includes("SUMMARY:Team Meeting"), "contains SUMMARY");
    assert.ok(ics.includes("DESCRIPTION:Weekly sync with the team"), "contains DESCRIPTION");
    assert.ok(ics.includes("DTSTART:20261101T090000Z"), "contains DTSTART");
    assert.ok(ics.includes("DTEND:20261101T100000Z"), "contains DTEND");
    assert.ok(ics.includes("ATTENDEE:mailto:alice@example.com"), "contains ATTENDEE");
    assert.ok(ics.includes("ATTENDEE:mailto:bob@example.com"), "contains second attendee");
  });

  it("imports ICS text back into CalendarEvent objects", () => {
    const ics = exportICS([testEvent]);
    const events = importICS(ics, "user-1");

    assert.strictEqual(events.length, 1);
    const event = events[0];
    assert.strictEqual(event.eventId, "evt-123");
    assert.strictEqual(event.userId, "user-1");
    assert.strictEqual(event.title, "Team Meeting");
    assert.strictEqual(event.description, "Weekly sync with the team");
    assert.strictEqual(event.startAt, "2026-11-01T09:00:00Z");
    assert.strictEqual(event.endAt, "2026-11-01T10:00:00Z");
    assert.strictEqual(event.status, "confirmed");
    assert.deepStrictEqual(event.attendees, ["alice@example.com", "bob@example.com"]);
    assert.strictEqual(event.recurrenceRule, "FREQ=WEEKLY;COUNT=10");
  });

  it("round-trips multiple events", async () => {
    const events: CalendarEvent[] = [
      {
        eventId: "evt-a",
        userId: "user-1",
        title: "First Event",
        description: null,
        startAt: "2026-11-01T09:00:00Z",
        endAt: "2026-11-01T10:00:00Z",
        status: "confirmed",
        attendees: [],
        recurrenceRule: null,
        createdAt: "2026-10-25T08:00:00Z",
        updatedAt: "2026-10-25T08:00:00Z",
      },
      {
        eventId: "evt-b",
        userId: "user-1",
        title: "Second Event",
        description: "Second description",
        startAt: "2026-11-02T14:00:00Z",
        endAt: "2026-11-02T15:30:00Z",
        status: "tentative",
        attendees: ["carol@example.com"],
        recurrenceRule: null,
        createdAt: "2026-10-25T09:00:00Z",
        updatedAt: "2026-10-25T09:00:00Z",
      },
    ];

    const ics = exportICS(events);
    const imported = importICS(ics, "user-1");

    assert.strictEqual(imported.length, 2);

    const first = imported[0];
    assert.strictEqual(first.eventId, "evt-a");
    assert.strictEqual(first.title, "First Event");
    assert.strictEqual(first.description, null);
    assert.strictEqual(first.attendees.length, 0);

    const second = imported[1];
    assert.strictEqual(second.eventId, "evt-b");
    assert.strictEqual(second.title, "Second Event");
    assert.strictEqual(second.description, "Second description");
    assert.deepStrictEqual(second.attendees, ["carol@example.com"]);
  });

  it("handles empty ICS input", () => {
    const events = importICS("", "user-1");
    assert.strictEqual(events.length, 0);
  });

  it("handles empty VCALENDAR", () => {
    const ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR";
    const events = importICS(ics, "user-1");
    assert.strictEqual(events.length, 0);
  });

  it("skips VEVENT without required fields", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      "SUMMARY:No UID",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const events = importICS(ics, "user-1");
    assert.strictEqual(events.length, 0);
  });

  it("round-trips events with special characters in text", () => {
    const eventWithSpecialChars: CalendarEvent = {
      eventId: "evt-special",
      userId: "user-1",
      title: "Meeting, with commas; and semicolons",
      description: "Line 1\nLine 2\nLine 3",
      startAt: "2026-11-01T09:00:00Z",
      endAt: "2026-11-01T10:00:00Z",
      status: "confirmed",
      attendees: [],
      recurrenceRule: null,
      createdAt: "2026-10-25T08:00:00Z",
      updatedAt: "2026-10-25T08:00:00Z",
    };

    const ics = exportICS([eventWithSpecialChars]);
    const imported = importICS(ics, "user-1");

    assert.strictEqual(imported.length, 1);
    assert.strictEqual(imported[0].title, "Meeting, with commas; and semicolons");
    assert.strictEqual(imported[0].description, "Line 1\nLine 2\nLine 3");
  });
});
