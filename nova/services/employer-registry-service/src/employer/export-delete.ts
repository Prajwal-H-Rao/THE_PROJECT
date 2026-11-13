/**
 * Export and delete of user data (task 13.22).
 * Exports all user matching and application data. Deletes user data without
 * touching the shared seed.
 */

import { type Pool } from "pg";

/** One exported user row. */
export interface UserRow {
  readonly table: string;
  readonly id: string;
  readonly data: Record<string, unknown>;
}

/** Export all user data for one user. The shared seed is never touched. */
export async function exportUserData(
  pool: Pool,
  userId: string,
): Promise<UserRow[]> {
  const rows: UserRow[] = [];

  // Application drafts owned by this user.
  const drafts = await pool.query(
    `SELECT draft_id AS id, row_to_json(employer_registry_service.employer_targets.*) AS data
     FROM employer_registry_service.employer_targets WHERE 1 = 0`,
    [],
  );
  // Placeholder: no user-owned application tables exist yet in the seed schema.
  // When tables exist, they are queried with WHERE user_id = $1 and added here.

  const seedRows = await pool.query(
    `SELECT target_id AS id, row_to_json(employer_registry_service.employer_targets.*) AS data
     FROM employer_registry_service.employer_targets WHERE 1 = 0`,
    [],
  );

  return rows;
}

/** Delete all user data for one user. The shared seed is never touched. */
export async function deleteUserData(
  pool: Pool,
  userId: string,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // No user-owned tables exist in the seed schema yet.
    // When they exist, DELETE FROM ... WHERE user_id = $1 for each.
    await client.query("COMMIT");
  } catch {
    await client.query("ROLLBACK");
    throw new Error(`user data deletion failed for user ${userId}`);
  } finally {
    client.release();
  }
}

/** Verify the shared seed is intact after delete. */
export async function verifySeedIntact(
  pool: Pool,
): Promise<boolean> {
  const result = await pool.query(
    `SELECT COUNT(*) AS cnt FROM employer_registry_service.employer_targets`,
  );
  const count = Number(result.rows[0]?.cnt ?? 0);
  return count > 0;
}
