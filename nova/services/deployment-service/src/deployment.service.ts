/**
 * Nova design system - Deployment service.
 * Provides deployment management.
 */

import { Injectable } from "@nestjs/common";
import { Pool } from "pg";

const DEPLOYMENTS_TABLE = "deployment_service.deployments";

@Injectable()
export class DeploymentService {
  constructor(@Inject("PG_POOL") private readonly pool: Pool) {}

  async createDeployment(serviceName: string, version: string, status: string) {
    const query = `INSERT INTO deployment_service.deployments (service_name, version, status) VALUES ($1, $2, $3) RETURNING *`;
    const result = await this.pool.query(query, [serviceName, version, status]);
    return result.rows[0];
  }

  async listDeployments() {
    const query = `SELECT * FROM deployment_service.deployments ORDER BY created_at DESC`;
    const result = await this.pool.query(query);
    return result.rows;
  }
}
