/**
 * Nova design system - Analytics service.
 * Provides analytics and reporting.
 */

import { Injectable } from "@nestjs/common";
import { Pool } from "pg";

@Injectable()
export class AnalyticsService {
  constructor(@Inject("PG_POOL") private readonly pool: Pool) {}

  async getDashboard(userId: string) {
    const query = `SELECT * FROM analytics.metrics WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`;
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }
}
