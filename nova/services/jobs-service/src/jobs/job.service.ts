/**
 * Nova design system - Jobs service.
 * Job orchestration service for scheduled tasks.
 */

import { Injectable, Inject } from "@nestjs/common";
import { Pool } from "pg";

const JOBS_TABLE = "jobs_service.jobs";

@Injectable()
export class JobsService {
  constructor(@Inject("PG_POOL") private readonly pool: Pool) {}

  async createJob(userId: string, type: string, payload: string, scheduledAt: string) {
    const query = `
      INSERT INTO ${JOBS_TABLE} (user_id, type, payload, scheduled_at, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING job_id, user_id, type, payload, status, created_at
    `;
    const result = await this.pool.query(query, [userId, type, payload, scheduledAt]);
    return result.rows[0];
  }

  async listJobs(userId: string) {
    const query = `
      SELECT job_id, user_id, type, payload, status, created_at, updated_at
      FROM ${JOBS_TABLE}
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }
}
