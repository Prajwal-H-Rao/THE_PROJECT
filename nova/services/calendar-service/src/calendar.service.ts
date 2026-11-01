/**
 * Nova design system - Calendar service.
 * CRUD operations for calendar events with ownership enforcement.
 */

import { Injectable } from "@nestjs/common";
import { CalendarEventRepository } from "./calendar.repository.js";
import type { CalendarEvent, CreateCalendarEventInput } from "./calendar.entity.js";

@Injectable()
export class CalendarEventService {
  constructor(private readonly repository: CalendarEventRepository) {}

  async createCalendarEvent(userId: string, input: CreateCalendarEventInput): Promise<CalendarEvent> {
    return this.repository.create(userId, input);
  }

  async getCalendarEvent(userId: string, eventId: string): Promise<CalendarEvent | null> {
    return this.repository.findById(userId, eventId);
  }

  async listCalendarEvents(userId: string): Promise<CalendarEvent[]> {
    return this.repository.list(userId);
  }
}
