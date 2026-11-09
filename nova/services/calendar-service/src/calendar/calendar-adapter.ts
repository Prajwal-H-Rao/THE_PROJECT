/**
 * Nova design system - Calendar adapter interface.
 * Defines the contract for calendar operations: list, get, create, update,
 * delete events. A Google Calendar adapter implements this interface.
 * Mock adapter is used because Google OAuth credentials are barred from source.
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

export interface CreateCalendarEventInput {
  readonly userId: string;
  readonly title: string;
  readonly description?: string;
  readonly startAt: string;
  readonly endAt: string;
  readonly attendees?: string[];
  readonly recurrenceRule?: string;
}

export interface UpdateCalendarEventInput {
  readonly eventId: string;
  readonly userId: string;
  readonly title?: string;
  readonly description?: string;
  readonly startAt?: string;
  readonly endAt?: string;
  readonly attendees?: string[];
  readonly recurrenceRule?: string;
}

export interface CalendarListResult {
  readonly events: readonly CalendarEvent[];
  readonly total: number;
  readonly nextPageToken: string | null;
}

export interface CalendarAdapter {
  list(userId: string, query?: string, limit?: number, pageToken?: string): Promise<CalendarListResult>;
  get(userId: string, eventId: string): Promise<CalendarEvent>;
  create(userId: string, input: CreateCalendarEventInput): Promise<CalendarEvent>;
  update(userId: string, input: UpdateCalendarEventInput): Promise<CalendarEvent>;
  delete(userId: string, eventId: string): Promise<void>;
}

export interface MockCalendarAdapter extends CalendarAdapter {
  addEvent(raw: Record<string, unknown>): string;
  getEvent(eventId: string): CalendarEvent | null;
  deleteEvent(eventId: string): void;
}

export function createMockCalendarAdapter(opts: { userId: string }): MockCalendarAdapter {
  const events: Map<string, CalendarEvent> = new Map();

  function toEvent(raw: Record<string, unknown>, id: string): CalendarEvent {
    return {
      eventId: id,
      userId: String(raw.userId ?? ""),
      title: String(raw.title ?? ""),
      description: (raw.description as string | null) ?? null,
      startAt: String(raw.startAt ?? ""),
      endAt: String(raw.endAt ?? ""),
      status: String(raw.status ?? "confirmed"),
      attendees: Array.isArray(raw.attendees) ? (raw.attendees as string[]) : [],
      recurrenceRule: (raw.recurrenceRule as string | null) ?? null,
      createdAt: String(raw.createdAt ?? new Date().toISOString()),
      updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
    };
  }

  const adapter: MockCalendarAdapter = {
    async list(userId, query = "", limit = 20, pageToken) {
      const all = Array.from(events.values()).filter(
        (e) => e.userId === userId && (e.title.includes(query) || (e.description !== null && e.description.includes(query)))
      );
      const start = pageToken ? Number(pageToken) : 0;
      const page = all.slice(start, start + limit);
      const next = start + limit < all.length ? String(start + limit) : null;
      return {
        events: page,
        total: all.length,
        nextPageToken: next,
      };
    },

    async get(userId, eventId) {
      const event = events.get(eventId);
      if (!event) {
        throw new Error(`Event not found: ${eventId}`);
      }
      if (event.userId !== userId) {
        throw new Error(`Event not found: ${eventId}`);
      }
      return event;
    },

    async create(userId, input) {
      const eventId = `evt-${crypto.randomUUID()}`;
      const event: CalendarEvent = {
        eventId,
        userId,
        title: input.title,
        description: input.description ?? null,
        startAt: input.startAt,
        endAt: input.endAt,
        status: "confirmed",
        attendees: input.attendees ?? [],
        recurrenceRule: input.recurrenceRule ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      events.set(eventId, event);
      return event;
    },

    async update(userId, input) {
      const event = events.get(input.eventId);
      if (!event) {
        throw new Error(`Event not found: ${input.eventId}`);
      }
      if (event.userId !== userId) {
        throw new Error(`Event not found: ${input.eventId}`);
      }
      const updated: CalendarEvent = {
        ...event,
        title: input.title ?? event.title,
        description: input.description ?? event.description,
        startAt: input.startAt ?? event.startAt,
        endAt: input.endAt ?? event.endAt,
        attendees: input.attendees ?? event.attendees,
        recurrenceRule: input.recurrenceRule ?? event.recurrenceRule,
        updatedAt: new Date().toISOString(),
      };
      events.set(input.eventId, updated);
      return updated;
    },

    async delete(userId, eventId) {
      const event = events.get(eventId);
      if (!event) {
        throw new Error(`Event not found: ${eventId}`);
      }
      if (event.userId !== userId) {
        throw new Error(`Event not found: ${eventId}`);
      }
      events.delete(eventId);
    },

    addEvent(raw: Record<string, unknown>) {
      const id = String(raw.eventId ?? crypto.randomUUID());
      events.set(id, toEvent(raw, id));
      return id;
    },

    getEvent(eventId: string): CalendarEvent | null {
      return events.get(eventId) ?? null;
    },

    deleteEvent(eventId: string): void {
      events.delete(eventId);
    },
  };

  return adapter;
}
