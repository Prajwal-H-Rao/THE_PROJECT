/**
 * Nova design system - Release gate service.
 * Provides release gate management.
 */

import { Injectable } from "@nestjs/common";
import { Pool } from "pg";

const RELEASE_GATE_TABLE = "deployment_service.release_gates";

@Injectable()
export class ReleaseGateService {
  constructor(@Inject("PG_POOL") private readonly pool: Pool) {}

  async createReleaseGate(releaseId: string, status: string, approverId: string) {
    const query = `INSERT INTO deployment_service.release_gates (release_id, status, approver_id) VALUES ($1, $2, $3) RETURNING *`;
    const result = await this.pool.query(query, [releaseId, status, approverId]);
    return result.rows[0];
  }

  async listReleaseGates() {
    const query = `SELECT * FROM deployment_service.release_gates ORDER BY created_at DESC`;
    const result = await this.pool.query(query);
    return result.rows;
  }
}
