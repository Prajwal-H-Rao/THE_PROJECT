/**
 * Nova design system - Content service.
 * Provides content management operations.
 */

import { Injectable } from "@nestjs/common";
import { Pool } from "pg";

const CONTENT_TABLE = "content_service.content";

@Injectable()
export class ContentService {
  constructor(@Inject("PG_POOL") private readonly pool: Pool) {}

  async createContent(userId: string, title: string, content: string, type: string) {
    const query = `INSERT INTO content_service.content (user_id, title, content, type) VALUES ($1, $2, $3, $4) RETURNING *`;
    const result = await this.pool.query(query, [userId, title, content, type]);
    return result.rows[0];
  }

  async listContent(userId: string) {
    const query = `SELECT * FROM content_service.content WHERE user_id = $1 ORDER BY created_at DESC`;
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }
}
