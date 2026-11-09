/**
 * Nova design system - Calendar service.
 * Provides calendar event CRUD operations with ownership enforcement.
 */

import { Injectable, Inject } from "@nestjs/common";
import { Pool } from "pg";

const CALENDAR_EVENTS_TABLE = "identity_service.calendar_events";

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

@Injectable()
export class CalendarEventRepository {
  constructor(@Inject("PG_POOL") private readonly pool: Pool) {}

  async create(userId: string, input: CreateCalendarEventInput): Promise<CalendarEvent> {
    const query = `
      INSERT INTO ${CALENDAR_EVENTS_TABLE}
        (user_id, title, description, start_at, end_at, attendees, recurrence_rule)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING event_id, user_id, title, description, start_at, end_at,
                status, attendees, recurrence_rule, created_at, updated_at
    `;
    const values = [
      userId,
      input.title,
      input.description ?? null,
      input.startAt,
      input.endAt,
      input.attendees ?? [],
      input.recurrenceRule ?? null,
    ];
    const result = await this.pool.query(query, values);
    return this.mapRow(result.rows[0]);
  }

  async findById(userId: string, eventId: string): Promise<CalendarEvent | null> {
    const query = `
      SELECT event_id, user_id, title, description, start_at, end_at,
             status, attendees, recurrence_rule, created_at, updated_at
      FROM ${CALENDAR_EVENTS_TABLE}
      WHERE event_id = $1 AND user_id = $2
    `;
    const result = await this.pool.query(query, [eventId, userId]);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async list(userId: string): Promise<CalendarEvent[]> {
    const query = `
      SELECT event_id, user_id, title, description, start_at, end_at,
             status, attendees, recurrence_rule, created_at, updated_at
      FROM ${CALENDAR_EVENTS_TABLE}
      WHERE user_id = $1
      ORDER BY start_at ASC
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows.map((row) => this.mapRow(row));
  }

  async detectConflicts(userId: string, startAt: string, endAt: string, excludeEventId?: string): Promise<CalendarEvent[]> {
    const query = `
      SELECT event_id, user_id, title, description, start_at, end_at,
             status, attendees, recurrence_rule, created_at, updated_at
      FROM ${CALENDAR_EVENTS_TABLE}
      WHERE user_id = $1
        AND start_at < $2
        AND end_at > $3
        AND ($4 IS NULL OR event_id <> $4)
    `;
    const values = [userId, endAt, startAt, excludeEventId ?? null];
    const result = await this.pool.query(query, values);
    return result.rows.map((row) => this.mapRow(row));
  }

  private mapRow(row: unknown): CalendarEvent {
    const r = row as Record<string, unknown>;
    return {
      eventId: String(r.event_id),
      userId: String(r.user_id),
      title: String(r.title),
      description: r.description === null ? null : String(r.description),
      startAt: String(r.start_at),
      endAt: String(r.end_at),
      status: String(r.status),
      attendees: Array.isArray(r.attendees) ? (r.attendees as string[]) : [],
      recurrenceRule: r.recurrence_rule === null ? null : String(r.recurrence_rule),
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    };
  }
}
