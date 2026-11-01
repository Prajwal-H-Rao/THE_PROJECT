/**
 * Nova design system - Messages service.
 * Provides message CRUD operations.
 */

import { Injectable, Inject } from "@nestjs/common";
import { Pool } from "pg";

const MESSAGES_TABLE = "messages.messages";

@Injectable()
export class MessageRepository {
  constructor(@Inject("PG_POOL") private readonly pool: Pool) {}

  async createMessage(userId: string, content: string, channel: string) {
    const query = `INSERT INTO messages.messages (user_id, content, channel) VALUES ($1, $2, $3) RETURNING *`;
    const result = await this.pool.query(query, [userId, content, channel]);
    return result.rows[0];
  }

  async listMessages(userId: string) {
    const query = `SELECT * FROM messages.messages WHERE user_id = $1 ORDER BY created_at DESC`;
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }
}

@Injectable()
export class MessageService {
  constructor(private readonly repo: MessageRepository) {}
  async createMessage(userId: string, content: string, channel: string) {
    return this.repo.createMessage(userId, content, channel);
  }
  async listMessages(userId: string) {
    return this.repository.listMessages(userId);
  }
}
