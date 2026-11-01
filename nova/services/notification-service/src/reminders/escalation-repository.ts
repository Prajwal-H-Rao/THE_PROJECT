/**
 * Nova design system - Escalation repository.
 * SQL queries against notification_service.reminders for escalation policy.
 * claimAndEscalate selects missed reminders (past due, not delivered,
 * not escalated) with UPDATE ... WHERE escalated = false in one atomic
 * statement, marks them escalated and returns them for escalation
 * notification.
 * Uses pg Pool for database connections.
 */

import { Injectable, Inject } from "@nestjs/common";
import { Pool } from "pg";

const REMINDERS_TABLE = "notification_service.reminders";

@Injectable()
export class EscalationRepository {
  constructor(@Inject("PG_POOL") private readonly pool: Pool) {}

  /** Claim and escalate missed reminders.
   * Selects reminders past due without delivery (status != 'delivered')
   * and not yet escalated (escalated = false). Updates escalated = true
   * and increments escalation_attempts in one atomic UPDATE statement.
   * Returns claimed reminders with their idempotency key and due_at.
   * Uses SELECT ... FOR UPDATE SKIP LOCKED so concurrent workers never
   * escalate the same reminder twice. */
  async claimAndEscalate(limit = 50): Promise<EscalatedReminder[]> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const claimed = await client.query(
        `UPDATE ${REMINDERS_TABLE}
         SET escalated = true,
             escalation_attempts = escalation_attempts + 1,
             escalated_at = now(),
             updated_at = now()
         WHERE escalated = false
           AND status != 'delivered'
           AND due_at < now()
         RETURNING reminder_id, idempotency_key, due_at, escalation_attempts
         ORDER BY due_at ASC
         LIMIT $1
         FOR UPDATE SKIP LOCKED`,
        [limit]
      );

      await client.query("COMMIT");

      return claimed.rows.map((row) => ({
        reminderId: String(row.reminder_id),
        idempotencyKey: String(row.idempotency_key),
        dueAt: String(row.due_at),
        escalationAttempts: Number(row.escalation_attempts),
      }));
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

/** One escalated reminder returned by claimAndEscalate. */
export interface EscalatedReminder {
  reminderId: string;
  idempotencyKey: string;
  dueAt: string;
  escalationAttempts: number;
}
