/**
 * The profile service. It versions resume profiles, records field sources and
 * user confirmations, and enforces immutability through the guard.
 */

import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { assertVersionEditable, type ProfileVersionRow } from "./profile-guard.js";

const PROFILES_TABLE = "jobs_service.resume_profile";

/** The service that owns resume_profile reads and writes. */
@Injectable()
export class ProfileService {
  constructor(@Inject("PG_POOL") private readonly pool: Pool) {}

  /** Create the next version of the user profile. Version numbers increase per user. */
  async createVersion(
    userId: string,
    fields: {
      headline?: string;
      summary?: string;
      skills?: string[];
      workAuth?: string;
      fieldSources?: Record<string, unknown>;
      extractedAt?: string;
    },
  ): Promise<Record<string, unknown> | undefined> {
    const result = await this.pool.query(
      `INSERT INTO ${PROFILES_TABLE}
         (user_id, version, headline, summary, skills, work_auth, field_sources, extracted_at)
       SELECT $1,
              COALESCE(MAX(version), 0) + 1,
              $2, $3, COALESCE($4, '{}'), $5, COALESCE($6, '{}'), $7
       FROM ${PROFILES_TABLE} WHERE user_id = $1
       RETURNING profile_id, user_id, version, headline, summary, skills, work_auth,
                 field_sources, extracted_at, used_at, created_at`,
      [userId, fields.headline ?? null, fields.summary ?? null, fields.skills ?? null,
       fields.workAuth ?? null, fields.fieldSources ? JSON.stringify(fields.fieldSources) : null,
       fields.extractedAt ?? null],
    );
    return result.rows[0];
  }

  /** Confirm fields as user-verified. The version must still be editable. */
  async confirmFields(profileId: string, fields: string[]): Promise<void> {
    const row = await this.loadRow(profileId);
    assertVersionEditable(row);
    await this.pool.query(
      `UPDATE ${PROFILES_TABLE}
       SET confirmed_fields = (
             SELECT array_agg(DISTINCT f) FROM unnest(confirmed_fields || $2::text[]) AS f),
           updated_at = now()
       WHERE profile_id = $1`,
      [profileId, fields],
    );
  }

  /** Mark a version used. The first writer wins; later marks are no-ops. */
  async markUsed(profileId: string): Promise<void> {
    await this.pool.query(
      `UPDATE ${PROFILES_TABLE} SET used_at = now()
       WHERE profile_id = $1 AND used_at IS NULL`,
      [profileId],
    );
  }

  /** Update editable fields. A used version fails through the guard, not silently. */
  async updateProfile(profileId: string, patch: { headline?: string; summary?: string }): Promise<void> {
    const row = await this.loadRow(profileId);
    assertVersionEditable(row);
    await this.pool.query(
      `UPDATE ${PROFILES_TABLE}
       SET headline = COALESCE($2, headline), summary = COALESCE($3, summary), updated_at = now()
       WHERE profile_id = $1`,
      [profileId, patch.headline ?? null, patch.summary ?? null],
    );
  }

  /** Load the guard input for one profile row. */
  private async loadRow(profileId: string): Promise<ProfileVersionRow> {
    const result = await this.pool.query(
      `SELECT profile_id, version, used_at FROM ${PROFILES_TABLE} WHERE profile_id = $1`,
      [profileId],
    );
    if (result.rowCount === 0) {
      throw new Error(`profile not found: ${profileId}`);
    }
    const row = result.rows[0]!;
    return { profile_id: row["profile_id"] as string, version: row["version"] as number, used_at: (row["used_at"] as string | null) ?? null };
  }
}
