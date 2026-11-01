/**
 * Nova design system - Reminder delivery repository.
 * Atomic claim-and-deliver for idempotent reminder execution.
 * claimReminder selects pending reminders with SELECT ... FOR UPDATE SKIP LOCKED
 * and marks them processing in one transaction. markDelivered and markFailed
 * match status='processing' and insert into reminder_delivery_log with
 * ON CONFLICT (idempotency_key) DO NOTHING to prevent duplicate delivery.
 * Uses pg Pool for database connections.
 */

import { Injectable, Inject } from "@nestjs/common";
import { Pool } from "pg";

const REMINDERS_TABLE = "notification_service.reminders";
const DELIVERY_LOG_TABLE = "notification_service.reminder_delivery_log";

/** One claimed reminder returned by claimReminder. */
export interface ClaimedReminder {
  reminderId: string;
  idempotencyKey: string;
}

@Injectable()
export class ReminderDeliveryRepository {
  constructor(@Inject("PG_POOL") private readonly pool: Pool) {}

  /** Claim one pending reminder for delivery.
   * Selects pending reminders with SKIP LOCKED so concurrent workers
   * never claim the same reminder. Marks it processing in the same
   * transaction. Returns the reminder id and idempotency key, or null
   * if no reminder is available. */
  async claimReminder(): Promise<ClaimedReminder | null> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const claim = await client.query(
        `SELECT reminder_id, idempotency_key FROM ${REMINDERS_TABLE}
         WHERE status = 'pending' AND due_at <= now()
         ORDER BY due_at ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED`
      );
      if (claim.rows.length === 0) {
        await client.query("COMMIT");
        return null;
      }

      const { reminder_id, idempotency_key } = claim.rows[0];

      await client.query(
        `UPDATE ${REMINDERS_TABLE}
         SET status = 'processing', updated_at = now()
         WHERE reminder_id = $1 AND status = 'pending'`,
        [reminder_id]
      );

      await client.query("COMMIT");
      return {
        reminderId: String(reminder_id),
        idempotencyKey: String(idempotency_key),
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /** Mark one claimed reminder as delivered.
   * Matches status='processing' so a reminder claimed by another worker
   * is not touched. Inserts into reminder_delivery_log with
   * ON CONFLICT (idempotency_key) DO NOTHING to prevent duplicate
   * delivery rows across retries. */
  async markDelivered(
    reminderId: string,
    providerMessageId: string,
    idempotencyKey: string
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `UPDATE ${REMINDERS_TABLE}
         SET status = 'delivered', updated_at = now()
         WHERE reminder_id = $1 AND status = 'processing'`,
        [reminderId]
      );

      await client.query(
        `INSERT INTO ${DELIVERY_LOG_TABLE}
           (reminder_id, provider_message_id, delivered_at, status, idempotency_key)
         VALUES ($1, $2, now(), 'delivered', $3)
         ON CONFLICT (idempotency_key) DO NOTHING`,
        [reminderId, providerMessageId, idempotencyKey]
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /** Mark one claimed reminder as failed.
   * Matches status='processing'. Increments attempt count. If attempts
   * exceed max, marks as dead letter. Inserts into reminder_delivery_log
   * with ON CONFLICT (idempotency_key) DO NOTHING. */
  async markFailed(
    reminderId: string,
    errorMessage: string,
    idempotencyKey: string
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const current = await client.query(
        `SELECT attempt_count, max_attempts FROM ${REMINDERS_TABLE}
         WHERE reminder_id = $1`,
        [reminderId]
      );
      const row = current.rows[0];
      if (!row) {
        await client.query("ROLLBACK");
        return;
      }

      const attemptCount = Number(row.attempt_count) + 1;
      const maxAttempts = Number(row.max_attempts);

      if (attemptCount >= maxAttempts) {
        await client.query(
          `UPDATE ${REMINDERS_TABLE}
           SET status = 'failed', dead_letter = true, dead_letter_reason = $2,
               attempt_count = $3, updated_at = now()
           WHERE reminder_id = $1 AND status = 'processing'`,
          [reminderId, errorMessage, attemptCount]
        );
      } else {
        await client.query(
          `UPDATE ${REMINDERS_TABLE}
           SET attempt_count = $2, updated_at = now()
           WHERE reminder_id = $1 AND status = 'processing'`,
          [reminderId, attemptCount]
        );
      }

      await client.query(
        `INSERT INTO ${DELIVERY_LOG_TABLE}
           (reminder_id, delivered_at, status, idempotency_key, error_message)
         VALUES ($1, now(), 'failed', $3, $4)
         ON CONFLICT (idempotency_key) DO NOTHING`,
        [reminderId, idempotencyKey, errorMessage]
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /** Reclaim orphaned processing reminders older than the given staleness
   * threshold. Resets them to pending so another worker can claim them.
   * Workers that crash after claiming but before marking delivered leave
   * reminders stuck in processing; this reclaims them. */
  async reclaimOrphaned(staleMinutes: number = 5): Promise<void> {
    await this.pool.query(
      `UPDATE ${REMINDERS_TABLE}
       SET status = 'pending', updated_at = now()
       WHERE status = 'processing'
         AND updated_at < now() - ($1 || '5 minutes')::interval`,
      [staleMinutes]
    );
  }
}
