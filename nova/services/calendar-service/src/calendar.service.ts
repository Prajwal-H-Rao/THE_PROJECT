/**
 * Nova design system - Calendar service.
 * CRUD operations for calendar events with ownership enforcement.
 */

import { Injectable } from "@nestjs/common";
import { CalendarEventRepository, type CalendarEvent, type CreateCalendarEventInput } from "./calendar.repository.js";

class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

@Injectable()
export class CalendarEventService {
  constructor(private readonly repository: CalendarEventRepository) {}

  async createCalendarEvent(userId: string, input: CreateCalendarEventInput): Promise<CalendarEvent> {
    // Conflict detection: reject if the proposed time range overlaps
    // with any existing event for this user (double-booking prevention).
    const conflicts = await this.repository.detectConflicts(userId, input.startAt, input.endAt);
    if (conflicts.length > 0) {
      throw new ConflictError(
        `Event conflicts with existing event "${conflicts[0].eventId}" (${conflicts[0].title}) at ${conflicts[0].startAt}-${conflicts[0].endAt}`,
      );
    }
    return this.repository.create(userId, input);
  }

  async getCalendarEvent(userId: string, eventId: string): Promise<CalendarEvent | null> {
    return this.repository.findById(userId, eventId);
  }

  async listCalendarEvents(userId: string): Promise<CalendarEvent[]> {
    return this.repository.list(userId);
  }
}
