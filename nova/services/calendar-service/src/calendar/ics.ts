/**
 * Nova design system - ICS import/export (task 09.14, module 09).
 * Parses iCalendar (RFC 5545) text into CalendarEvent objects and
 * serializes CalendarEvent objects back into ICS text.
 * Pure stdlib: no @nestjs/common, no pg, no external dependencies.
 */

/**
 * CalendarEvent represents a calendar event in the NOVA system.
 */
export interface CalendarEvent {
  readonly eventId: string;
  readonly userId: string;
  readonly title: string;
  readonly description: string | null;
  readonly startAt: string;
  readonly endAt: string;
  readonly status: string;
  readonly attendees: string[];
  readonly recurrenceRule: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Parse an iCalendar (ICS) string into an array of CalendarEvent objects.
 * Only VEVENT components are extracted; VCALENDAR wrapper is expected.
 */
export function importICS(icsContent: string, userId: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const lines = icsContent.split(/\r\n|\r|\n/);

  let currentEvent: Record<string, string> | null = null;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Unfold folded lines (continuation lines start with space or tab)
    while (i + 1 < lines.length && /^[ \t]/.test(lines[i + 1])) {
      i++;
      line += lines[i].slice(1);
    }

    const upperLine = line.toUpperCase();

    if (upperLine === "BEGIN:VEVENT") {
      currentEvent = {};
    } else if (upperLine === "END:VEVENT") {
      if (currentEvent) {
        const event = icsEventToCalendarEvent(currentEvent, userId);
        if (event) {
          events.push(event);
        }
      }
      currentEvent = null;
    } else if (currentEvent) {
      const colonIndex = line.indexOf(":");
      if (colonIndex === -1) continue;

      const key = line.slice(0, colonIndex).toUpperCase();
      const value = line.slice(colonIndex + 1);

      // Store by ICS property name (uppercase key for lookup)
      // ATTENDEE can appear multiple times; collect into array
      if (key === "ATTENDEE") {
        if (!currentEvent["ATTENDEE"]) {
          currentEvent["ATTENDEE"] = [];
        }
        (currentEvent["ATTENDEE"] as string[]).push(value);
      } else {
        currentEvent[key] = value;
      }
    }
  }

  return events;
}

/**
 * Convert a parsed ICS VEVENT object to a CalendarEvent.
 */
function icsEventToCalendarEvent(
  raw: Record<string, string | string[]>,
  userId: string
): CalendarEvent | null {
  const uid = raw["UID"];
  if (!uid) return null; // UID is required for an event

  const startAt = parseICSDateTime(raw["DTSTART"]);
  const endAt = raw["DTEND"] ? parseICSDateTime(raw["DTEND"]) : undefined;

  if (!startAt || !endAt) return null; // DTSTART and DTEND are required

  return {
    eventId: unescapeICSText(uid),
    userId,
    title: unescapeICSText(raw["SUMMARY"]) || "Untitled Event",
    description: raw["DESCRIPTION"]
      ? unescapeICSText(raw["DESCRIPTION"])
      : null,
    startAt,
    endAt,
    status: unescapeICSText(raw["STATUS"]) || "confirmed",
    attendees: parseAttendees(raw["ATTENDEE"]),
    recurrenceRule: raw["RRULE"]
      ? unescapeICSText(raw["RRULE"])
      : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Parse an iCalendar date-time value into ISO 8601 format.
 * Handles formats like:
 *   20261101T090000Z  (basic format with UTC)
 *   20261101T090000   (basic format, local time)
 *   2026-11-01T09:00:00Z (extended format with UTC)
 *   2026-11-01T09:00:00 (extended format, local time)
 */
function parseICSDateTime(value: string): string | null {
  if (!value) return null;

  // Remove hyphens and colons for basic format parsing
  const clean = value.replace(/[-:]/g, "");

  // Match: YYYYMMDDTHHMMSS with optional Z suffix
  const match = clean.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (!match) return null;

  const [, year, month, day, hours, minutes, seconds] = match;
  const iso = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${
    match[7] ? "Z" : ""
  }`;

  return iso;
}

/**
 * Parse ATTENDEE values into an array of email addresses.
 * Handles formats like:
 *   ATTENDEE:mailto:alice@example.com
 *   ATTENDEE:mailto:alice@example.com;CN=Alice
 */
function parseAttendees(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const values = Array.isArray(value) ? value : [value];
  return values
    .map((a) => {
      const mailtoMatch = a.match(/^mailto:(.+)$/i);
      return unescapeICSText(mailtoMatch ? mailtoMatch[1] : a.trim());
    })
    .filter(Boolean);
}

/**
 * Escape special characters in iCalendar text values.
 * Per RFC 5545, escape commas, semicolons, and newlines.
 */
function escapeICSText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

/**
 * Unescape iCalendar text values.
 */
function unescapeICSText(value: string): string {
  return value.replace(/\\n/g, "\n").replace(/\\;/g, ";").replace(/\\,/g, ",").replace(/\\\\/g, "\\");
}

/**
 * Format an ISO 8601 date-time string into iCalendar basic format (YYYYMMDDTHHMMSSZ).
 */
function formatICSTime(isoString: string): string {
  const match = isoString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:Z|[+-]\d{2}:(\d{2}))?$/);
  if (!match) return isoString;

  const [, year, month, day, hours, minutes, seconds] = match;
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Serialize an array of CalendarEvent objects into iCalendar (ICS) text.
 */
export function exportICS(events: CalendarEvent[]): string {
  const lines: string[] = [];

  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//NOVA//Calendar Service//EN");
  lines.push("CALSCALE:GREGORIAN");
  lines.push("METHOD:PUBLISH");

  for (const event of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${event.eventId}`);
    lines.push(`DTSTART:${formatICSTime(event.startAt)}`);
    lines.push(`DTEND:${formatICSTime(event.endAt)}`);
    lines.push(`SUMMARY:${escapeICSText(event.title)}`);
    if (event.description) {
      lines.push(`DESCRIPTION:${escapeICSText(event.description)}`);
    }
    for (const attendee of event.attendees) {
      lines.push(`ATTENDEE:mailto:${attendee}`);
    }
    lines.push(`STATUS:${event.status}`);
    if (event.recurrenceRule) {
      lines.push(`RRULE:${escapeICSText(event.recurrenceRule)}`);
    }
    lines.push(`DTSTAMP:${event.createdAt}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}
