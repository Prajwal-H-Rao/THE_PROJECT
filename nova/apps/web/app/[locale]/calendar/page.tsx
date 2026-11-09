/**
 * Nova design system - Calendar page (task 09.16, module 09).
 * Three views (agenda, week, month); one shared timezone state so every
 * view keeps the timezone. Categories and statuses pair colour with a
 * text label, never colour alone (spec:279, spec:405). Selecting an
 * event opens a write preview listing invitees and conflicts (spec:408).
 */

"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActionPreview } from "@/components/ActionPreview";

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  attendees: string[];
  status: "confirmed" | "pending" | "cancelled";
  category: string;
}

interface CalendarPageProps {
  initialEvents?: CalendarEvent[];
}

const VIEWS = ["Agenda", "Week", "Month"] as const;
type View = (typeof VIEWS)[number];

// Status and category always render their own text label beside their
// variant colour, so colour alone never encodes meaning (spec:279).
const STATUS_VARIANT: Record<CalendarEvent["status"], "success" | "warning" | "destructive"> = {
  confirmed: "success",
  pending: "warning",
  cancelled: "destructive",
};
const CATEGORY_VARIANTS = ["info", "secondary", "outline", "warning", "success"] as const;

// Purpose: pick a stable badge variant for an event category.
function categoryVariant(category: string) {
  let hash = 0;
  for (const char of category) hash += char.charCodeAt(0);
  return CATEGORY_VARIANTS[hash % CATEGORY_VARIANTS.length];
}

// Purpose: find events whose time range overlaps the given event.
function findConflicts(event: CalendarEvent, events: CalendarEvent[]): string[] {
  return events
    .filter((other) =>
      other.id !== event.id &&
      new Date(other.start) < new Date(event.end) &&
      new Date(event.start) < new Date(other.end)
    )
    .map((other) => other.title);
}

// Purpose: format a timestamp in the page's timezone.
function formatTime(iso: string, timezone: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    timeZone: timezone, hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  });
}

// Purpose: format a calendar day header in the page's timezone.
function formatDay(iso: string, timezone: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    timeZone: timezone, weekday: "short", month: "short", day: "numeric",
  });
}

export function CalendarPage({ initialEvents = [] }: CalendarPageProps) {
  const [view, setView] = useState<View>("Agenda");
  const [timezone, setTimezone] = useState("UTC");
  const [selected, setSelected] = useState<CalendarEvent | null>(null);

  const conflicts = selected ? findConflicts(selected, initialEvents) : [];

  // Group events by day label. Agenda shows every day; week shows only
  // events starting within the next 7 days, so the views differ.
  const byDay = useMemo(() => {
    const weekEnd = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const groups = new Map<string, CalendarEvent[]>();
    for (const event of initialEvents) {
      if (view === "Week" && new Date(event.start).getTime() > weekEnd) continue;
      const key = formatDay(event.start, timezone);
      groups.set(key, [...(groups.get(key) ?? []), event]);
    }
    return [...groups.entries()];
  }, [initialEvents, view, timezone]);

  // Purpose: render one event row as a real button for keyboard access.
  const renderEvent = (event: CalendarEvent) => (
    <button
      key={event.id}
      type="button"
      data-testid={`event-${event.id}`}
      onClick={() => setSelected(event)}
      className="w-full cursor-pointer rounded-md border border-border bg-muted/50 p-2 text-left"
    >
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-foreground">{event.title}</span>
        <Badge variant={STATUS_VARIANT[event.status]}>{event.status}</Badge>
        <Badge variant={categoryVariant(event.category)}>{event.category}</Badge>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {formatTime(event.start, timezone)} - {formatTime(event.end, timezone)}
      </div>
    </button>
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-foreground">Calendar</h1>
        {/* One timezone selector shared by all views; it keeps its value
            when the user switches views. */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground" htmlFor="calendar-tz">
            Timezone:
          </label>
          <select id="calendar-tz" aria-label="Timezone" value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="rounded border border-border bg-input px-2 py-1 text-xs">
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern (ET)</option>
            <option value="Europe/London">London (GMT)</option>
            <option value="Asia/Tokyo">Tokyo (JST)</option>
          </select>
        </div>
        <div className="flex gap-2">
          {VIEWS.map((name) => (
            <Button key={name} variant={view === name ? "default" : "outline"} size="sm"
              onClick={() => setView(name)} aria-label={`View: ${name}`}>
              {name}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto" data-testid={view === "Week" ? "week-cells" : "agenda-cells"}>
        {byDay.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No events in this view.</div>
        ) : view === "Month" ? (
          // Month view: a 7-column grid of day cells with their events.
          <div className="grid grid-cols-7 gap-1 rounded-lg border border-border p-2" data-testid="month-grid">
            {byDay.flatMap(([day, events]) => (
              <div key={day} data-testid="month-cell" className="rounded bg-muted/30 p-2">
                <div className="text-xs font-semibold text-foreground">{day}</div>
                {events.map(renderEvent)}
              </div>
            ))}
          </div>
        ) : (
          // Agenda and week views: per-day sections.
          byDay.map(([day, events]) => (
            <div key={day} className="rounded-lg border border-border p-3">
              <h3 className="mb-2 text-sm font-semibold text-foreground">{day}</h3>
              <div className="flex flex-col gap-2">{events.map(renderEvent)}</div>
            </div>
          ))
        )}
      </div>

      {selected && (
        <section data-testid="approval-preview" aria-label="Approval preview"
          className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <h3 className="text-sm font-semibold text-foreground">Approve event write</h3>
          <div className="text-xs">
            <span className="font-medium text-muted-foreground">Invitees: </span>
            {selected.attendees.join(", ")}
          </div>
          <div className="text-xs">
            <span className="font-medium text-muted-foreground">Conflicts: </span>
            {conflicts.length > 0 ? conflicts.join(", ") : "None"}
          </div>
          <ActionPreview tool="calendar.create_event"
            arguments={{ title: selected.title, start: selected.start, end: selected.end }}
            permissions={["calendar.write"]}
            sideEffects={["Creates calendar event", "Notifies attendees"]}
            reversible={true} expiry={new Date(selected.start)}
            rationale="Calendar writes need an approval grant."
            onApprove={() => setSelected(null)} onReject={() => setSelected(null)} loading={false} />
        </section>
      )}
    </div>
  );
}

// Next.js route pages need a default export; re-export the type for tests.
export default CalendarPage;
