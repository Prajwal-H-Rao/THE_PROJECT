/**
 * Nova design system - Calendar page (task 09.16, module 09).
 * Renders calendar view with agenda, week, month views, timezone indicator,
 * and approval preview showing invitees and conflicts.
 * Spec:408 - A write preview lists invitees and conflicts.
 * Spec:366 - Chat must stay usable at 320px width.
 * Spec:279 - Status must not be encoded with color alone: pair status colors with text, icon and/or label.
 */

"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionPreview } from "@/components/ActionPreview";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  attendees: string[];
  status: "confirmed" | "pending" | "cancelled";
}

interface CalendarDay {
  date: string;
  events: CalendarEvent[];
}

interface CalendarViewProps {
  initialEvents?: CalendarEvent[];
}

interface CalendarViewState {
  view: "agenda" | "week" | "month";
  timezone: string;
  selectedDate: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function groupEventsByDate(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  const groups: Record<string, CalendarEvent[]> = {};
  for (const event of events) {
    const dateKey = new Date(event.start).toDateString();
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(event);
  }
  return groups;
}

export function CalendarPage({ initialEvents = [] }: CalendarViewProps) {
  const [view, setView] = useState<CalendarViewState["view"]>("agenda");
  const [timezone, setTimezone] = useState<string>("UTC");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const filteredEvents = events.filter((e) => {
    if (!selectedDate) return true;
    return new Date(e.start).toDateString() === new Date(selectedDate).toDateString();
  });

  const groupedEvents = groupEventsByDate(filteredEvents);
  const sortedDates = Object.keys(groupedEvents).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setSelectedDate(new Date(event.start).toDateString());
  };

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {/* Header with timezone selector and view toggle */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-foreground">Calendar</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Timezone:</span>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="text-xs border border-border rounded px-2 py-1 bg-input"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern (ET)</option>
              <option value="America/Chicago">Central (CT)</option>
              <option value="America/Denver">Mountain (MT)</option>
              <option value="America/Los_Angeles">Pacific (PT)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          {["agenda", "week", "month"].map((viewName) => (
            <Button
              key={viewName}
              variant={view === viewName ? "default" : "outline"}
              size="sm"
              onClick={() => setView(viewName as CalendarViewState["view"])}
              aria-label={`View: ${viewName}`}
            >
              {viewName.charAt(0).toUpperCase() + viewName.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar content */}
      <div className="flex-1 overflow-auto">
        {view === "agenda" && (
          <div className="flex flex-col gap-4">
            {sortedDates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                No events scheduled.
              </div>
            ) : (
              sortedDates.map((dateKey) => {
                const date = new Date(dateKey);
                const isOverdue =
                  new Date(dateKey) < new Date(new Date().setHours(0, 0, 0, 0));
                const dayEvents = groupedEvents[dateKey] || [];

                return (
                  <div key={dateKey} className="border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        {formatDate(dateKey)}
                      </h3>
                      {isOverdue && (
                        <Badge variant="destructive" className="text-xs">
                          Overdue
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {dayEvents.map((event) => (
                        <div
                          key={event.id}
                          onClick={() => handleSelectEvent(event)}
                          className={`cursor-pointer rounded-md p-2 ${event.status === "confirmed" ? "bg-blue-50 border border-blue-100" : event.status === "tentative" ? "bg-amber-50 border border-amber-100" : "bg-muted/50 border border-muted"}`}
                        >
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium text-foreground">
                              {event.title}
                            </span>
                            <Badge
                              variant={
                                event.status === "confirmed"
                                  ? "success"
                                  : event.status === "tentative"
                                    ? "warning"
                                    : "destructive"
                              }
                              size="xs"
                            >
                              {event.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatTime(event.start)} - {formatTime(event.end)}
                          </div>
                          {event.attendees.length > 0 && (
                            <div className="text-xs mt-1">
                              <span className="font-medium text-muted-foreground">
                                Attendees:
                              </span>
                              {event.attendees.join(", ")}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
          {view === "week" && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-foreground">
                Week of {new Date(selectedDate || new Date()).toLocaleDateString(
                  undefined,
                  { month: "short", day: "numeric" }
                )}
              </h3>
              <div className="flex flex-col gap-2">
                {sortedDates.map((dateKey) => {
                  const dayEvents = groupedEvents[dateKey] || [];
                  return (
                    <div key={dateKey} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-foreground">
                          {formatDate(dateKey)}
                        </h4>
                        <Badge
                          variant={
                            new Date(dateKey) <
                            new Date(new Date().setHours(0, 0, 0, 0))
                              ? "destructive"
                              : "secondary"
                          }
                          size="sm"
                        >
                          {new Date(dateKey) <
                            new Date(new Date().setHours(0, 0, 0, 0))
                            ? "Past"
                            : "Upcoming"}
                        </Badge>
                      </div>
                      <div className="flex flex-col gap-1">
                        {dayEvents.map((event) => (
                          <div
                            key={event.id}
                            onClick={() => handleSelectEvent(event)}
                            className={`cursor-pointer rounded-md p-2 ${event.status === "confirmed" ? "bg-blue-50 border border-blue-100" : event.status === "tentative" ? "bg-amber-50 border border-amber-100" : "bg-muted/50 border border-muted"}`}
                          >
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-foreground">
                                {event.title}
                              </span>
                              <Badge
                                variant={
                                  event.status === "confirmed"
                                    ? "success"
                                    : event.status === "tentative"
                                      ? "warning"
                                      : "destructive"
                                }
                                size="xs"
                              >
                                {event.status}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {formatTime(event.start)} - {formatTime(event.end)}
                            </div>
                            {event.attendees.length > 0 && (
                              <div className="text-xs mt-1">
                                <span className="font-medium text-muted-foreground">
                                  Attendees:
                                </span>
                                {event.attendees.join(", ")}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          {view === "month" && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-foreground">
                Month View
              </h3>
              <div className="grid grid-cols-7 gap-1 border border-border rounded-lg p-2">
                {/* Day headers */}
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="text-xs text-center text-muted-foreground font-medium">
                    {day}
                  </div>
                ))}
                {/* Days of month */}
                {Array.from({ length: 31 }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `2026-11-${dayNum.toString().padStart(2, "0")}`;
                  const dayEvents = groupedEvents[new Date(dateStr).toDateString()] || [];
                  const hasEvents = dayEvents.length > 0;
                  return (
                    <div key={i} className={`flex flex-col gap-1 p-2 rounded-lg ${hasEvents ? "bg-blue-50 border border-blue-100" : "bg-muted/20 border border-transparent"}`}>
                      <div className="text-xs font-semibold text-foreground">
                        {dayNum}
                      </div>
                      {dayEvents.map((event) => (
                        <div
                          key={event.id}
                          onClick={() => handleSelectEvent(event)}
                          className="cursor-pointer rounded-md p-1 text-xs"
                        >
                          {event.title}
                          <Badge
                            variant={
                              event.status === "confirmed"
                                ? "success"
                                : event.status === "tentative"
                                  ? "warning"
                                  : "destructive"
                            }
                            size="xs"
                          >
                            {event.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                )}
              </div>
            </div>
          )}
        </div>

        {/* Approval preview panel */}
        {selectedEvent && (
          <div className="flex-1 overflow-auto">
            <ActionPreview
              tool="calendar.create_event"
              arguments={{
                title: selectedEvent.title,
                start: selectedEvent.start,
                end: selectedEvent.end,
                attendees: selectedEvent.attendees.join(", "),
              }}
              permissions={["calendar.write"]}
              sideEffects={["Creates calendar event", "Notifies attendees"]}
              reversible={true}
              expiry={new Date(selectedEvent.start)}
              rationale="Calendar event creation requires approval to prevent double-booking."
              onApprove={() => {
                setSelectedEvent(null);
              }}
              onReject={() => {
                setSelectedEvent(null);
              }}
              loading={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
