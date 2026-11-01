/**
 * Nova design system - Reminder delivery log repository.
 * Query methods against notification_service.reminder_delivery_log.
 * Supports filtering by reminder ID, by status, and by date range.
 * Uses pg Pool for database connections.
 */

import { Injectable, Inject } from "@nestjs/common";
import { Pool } from "pg";
import type { ReminderDeliveryLog } from "./reminder.entity.js";

const DELIVERY_LOG_TABLE = "notification_service.reminder_delivery_log";

@Injectable()
export class ReminderDeliveryLogRepository {
  constructor(@Inject("PG_POOL") private readonly pool: Pool) {}

  /** Find delivery log entries by reminder ID. */
  async findByReminderId(reminderId: string): Promise<ReminderDeliveryLog[]> {
    const query = `
      SELECT log_id, reminder_id, provider_message_id, delivered_at, status,
             idempotency_key, error_message, created_at
      FROM ${DELIVERY_LOG_TABLE}
      WHERE reminder_id = $1
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [reminderId]);
    return result.rows.map((row) => this.mapRow(row));
  }

  /** Find delivery log entries by status. */
  async findByStatus(status: string): Promise<ReminderDeliveryLog[]> {
    const query = `
      SELECT log_id, reminder_id, provider_message_id, delivered_at, status,
             idempotency_key, error_message, created_at
      FROM ${DELIVERY_LOG_TABLE}
      WHERE status = $1
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [status]);
    return result.rows.map((row) => this.mapRow(row));
  }

  /** Find delivery log entries by date range (delivered_at between start and end). */
  async findByDateRange(
    startDate: string,
    endDate: string
  ): Promise<ReminderDeliveryLog[]> {
    const query = `
      SELECT log_id, reminder_id, provider_message_id, delivered_at, status,
             idempotency_key, error_message, created_at
      FROM ${DELIVERY_LOG_TABLE}
      WHERE delivered_at >= $1 AND delivered_at <= $2
      ORDER BY delivered_at ASC
    `;
    const result = await this.pool.query(query, [startDate, endDate]);
    return result.rows.map((row) => this.mapRow(row));
  }

  /** Map a database row to a ReminderDeliveryLog entity. */
  private mapRow(row: unknown): ReminderDeliveryLog {
    const r = row as Record<string, unknown>;
    return {
      logId: String(r.log_id),
      reminderId: String(r.reminder_id),
      providerMessageId: r.provider_message_id === null ? null : String(r.provider_message_id),
      deliveredAt: r.delivered_at === null ? null : String(r.delivered_at),
      status: String(r.status),
      idempotencyKey: String(r.idempotency_key),
      errorMessage: r.error_message === null ? null : String(r.error_message),
      createdAt: String(r.created_at),
    };
  }
}
