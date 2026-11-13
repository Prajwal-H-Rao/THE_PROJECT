/**
 * Nova design system - Employer Registry service.
 * Provides employer registry CRUD operations.
 */

import { Injectable, Inject } from "@nestjs/common";
import { Pool } from "pg";

const EMPLOYERS_TABLE = "employer_registry.employers";

/** One employer row as stored in employer_registry.employers. */
interface EmployerRow {
  readonly name: string;
  readonly status: string;
  readonly type: string;
  readonly region: string | null;
  readonly contact_info: Record<string, unknown>;
}

@Injectable()
export class EmployerRegistryRepository {
  constructor(@Inject("PG_POOL") private readonly pool: Pool) {}

  async createEmployer(employer: EmployerRow) {
    const query = `
      INSERT INTO employer_registry.employers (name, status, type, region, contact_info)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      employer.name,
      employer.status || "active",
      employer.type || "GLOBAL",
      employer.region || null,
      JSON.stringify(employer.contact_info ?? {}),
    ]);
    return result.rows[0];
  }

  async listEmployers() {
    const query = "SELECT * FROM employer_registry.employers ORDER BY created_at DESC";
    const result = await this.pool.query(query);
    return result.rows;
  }
}
