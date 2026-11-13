/**
 * Export and deletion (task 12.20).
 * Export contains every user row for resume and application records.
 * Deletion removes user data without touching the shared seed.
 */

import { type Pool } from "pg";

/** One exported user row. */
export interface UserRow {
  readonly table: string;
  readonly id: string;
  readonly data: Record<string, unknown>;
}

/** Export all user rows for one user. */
export async function exportUserData(
  pool: Pool,
  userId: string,
): Promise<UserRow[]> {
  const rows: UserRow[] = [];

  const drafts = await pool.query(
    `SELECT draft_id AS id, row_to_json(jobs_service.application_draft.*) AS data
     FROM jobs_service.application_draft WHERE user_id = $1`,
    [userId],
  );
  for (const row of drafts.rows) {
    rows.push({ table: "application_draft", id: row.id, data: row.data });
  }

  const submissions = await pool.query(
    `SELECT submission_id AS id, row_to_json(jobs_service.application_submission.*) AS data
     FROM jobs_service.application_submission s
     JOIN jobs_service.application_draft d ON d.draft_id = s.draft_id
     WHERE d.user_id = $1`,
    [userId],
  );
  for (const row of submissions.rows) {
    rows.push({ table: "application_submission", id: row.id, data: row.data });
  }

  const profiles = await pool.query(
    `SELECT profile_id AS id, row_to_json(jobs_service.resume_profile.*) AS data
     FROM jobs_service.resume_profile WHERE user_id = $1`,
    [userId],
  );
  for (const row of profiles.rows) {
    rows.push({ table: "resume_profile", id: row.id, data: row.data });
  }

  return rows;
}

/** Delete all user data for one user (shared seed untouched). */
export async function deleteUserData(pool: Pool, userId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `DELETE FROM jobs_service.application_submission
       WHERE draft_id IN (SELECT draft_id FROM jobs_service.application_draft WHERE user_id = $1)`,
      [userId],
    );
    await client.query(`DELETE FROM jobs_service.application_draft WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM jobs_service.resume_profile WHERE user_id = $1`, [userId]);
    await client.query("COMMIT");
  } catch {
    await client.query("ROLLBACK");
    throw new Error(`user data deletion failed for user ${userId}`);
  } finally {
    client.release();
  }
}

/** Return true when the export contains at least one row per expected table. */
export function exportComplete(rows: UserRow[]): boolean {
  const tables = new Set(rows.map((r) => r.table));
  return tables.has("application_draft")
    && tables.has("application_submission")
    && tables.has("resume_profile");
}
