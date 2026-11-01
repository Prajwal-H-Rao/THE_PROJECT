/**
 * Nova design system - Reminder repository.
 * CRUD queries against notification_service.reminders.
 * Idempotent delivery keyed on reminder idempotency_key.
 * Uses pg Pool for database connections.
 */

import { Injectable, Inject } from "@nestjs/common";
import { Pool } from "pg";
import type {
  Reminder,
  CreateReminderInput,
} from "./reminder.entity.js";

const REMINDERS_TABLE = "notification_service.reminders";

@Injectable()
export class ReminderRepository {
  constructor(@Inject("PG_POOL") private readonly pool: Pool) {}

  /** Create one reminder for one user. Idempotency key prevents duplicates. */
  async create(userId: string, input: CreateReminderInput): Promise<Reminder> {
    const query = `
      INSERT INTO ${REMINDERS_TABLE}
        (user_id, title, message, due_at, idempotency_key, max_attempts)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING reminder_id, user_id, title, message, due_at, status,
                idempotency_key, attempt_count, max_attempts, cancelled_at,
                cancelled_reason, dead_letter, dead_letter_reason,
                created_at, updated_at
    `;
    const values = [
      userId,
      input.title,
      input.message ?? null,
      input.dueAt,
      input.idempotencyKey,
      input.maxAttempts ?? 5,
    ];
    const result = await this.pool.query(query, values);
    return this.mapReminderRow(result.rows[0]);
  }

  /** Read one reminder by ID. */
  async findById(reminderId: string): Promise<Reminder | null> {
    const query = `
      SELECT reminder_id, user_id, title, message, due_at, status,
             idempotency_key, attempt_count, max_attempts, cancelled_at,
             cancelled_reason, dead_letter, dead_letter_reason,
             created_at, updated_at
      FROM ${REMINDERS_TABLE}
      WHERE reminder_id = $1
    `;
    const result = await this.pool.query(query, [reminderId]);
    return result.rows.length > 0 ? this.mapReminderRow(result.rows[0]) : null;
  }

  /** List pending reminders due at or before the given time. */
  async listDue(before: string, limit = 50): Promise<Reminder[]> {
    const query = `
      SELECT reminder_id, user_id, title, message, due_at, status,
             idempotency_key, attempt_count, max_attempts, cancelled_at,
             cancelled_reason, dead_letter, dead_letter_reason,
             created_at, updated_at
      FROM ${REMINDERS_TABLE}
      WHERE status = 'pending' AND due_at <= $1
      ORDER BY due_at ASC
      LIMIT $2
    `;
    const result = await this.pool.query(query, [before, limit]);
    return result.rows.map((row) => this.mapReminderRow(row));
  }

  /** Cancel one reminder. Returns true if cancelled, false if not found
   * or already cancelled/delivered. */
  async cancel(reminderId: string): Promise<boolean> {
    const query = `
      UPDATE ${REMINDERS_TABLE}
      SET status = 'cancelled', cancelled_at = now(), updated_at = now()
      WHERE reminder_id = $1 AND status = 'pending'
      RETURNING reminder_id
    `;
    const result = await this.pool.query(query, [reminderId]);
    return (result.rowCount ?? 0) > 0;
  }

  /** Map a database row to a Reminder entity. */
  private mapReminderRow(row: unknown): Reminder {
    const r = row as Record<string, unknown>;
    return {
      reminderId: String(r.reminder_id),
      userId: String(r.user_id),
      title: String(r.title),
      message: r.message === null ? null : String(r.message),
      dueAt: String(r.due_at),
      status: String(r.status),
      idempotencyKey: String(r.idempotency_key),
      attemptCount: Number(r.attempt_count),
      maxAttempts: Number(r.max_attempts),
      cancelledAt: r.cancelled_at === null ? null : String(r.cancelled_at),
      cancelledReason: r.cancelled_reason === null ? null : String(r.cancelled_reason),
      deadLetter: Boolean(r.dead_letter),
      deadLetterReason: r.dead_letter_reason === null ? null : String(r.dead_letter_reason),
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    };
  }
}
