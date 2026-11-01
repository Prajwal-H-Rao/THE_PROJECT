/**
 * Message repository - durable dedup gate for inbound mail.
 * Uses SQL INSERT ... ON CONFLICT (user_id, message_id) DO NOTHING as the
 * sole authoritative claim gate. The UNIQUE constraint on
 * inbox_service.emails (user_id, message_id) enforces at-most-once processing
 * across restarts and concurrent polls.
 */

import { Injectable, Inject } from "@nestjs/common";
import { Pool } from "pg";

const EMAILS_TABLE = "inbox_service.emails";

@Injectable()
export class MessageRepository {
  constructor(@Inject("PG_POOL") private readonly pool: Pool) {}

  /** Try to insert one message as a dedup claim.
   * Returns true if the message is new (inserted), false if already processed
   * (ON CONFLICT skip). The UNIQUE constraint serializes concurrent claims.
   */
  async insertMessage(userId: string, messageId: string): Promise<boolean> {
    const query = `
      INSERT INTO ${EMAILS_TABLE} (user_id, message_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, message_id) DO NOTHING
      RETURNING message_id
    `;
    const result = await this.pool.query(query, [userId, messageId]);
    return (result.rowCount ?? 0) > 0;
  }
}
