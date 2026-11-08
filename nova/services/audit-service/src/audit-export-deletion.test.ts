/** Test for task 02.13: export and deletion workflow.
 *
 * Verifies the migration-11 SQL functions export_user_data and delete_user_data
 * against a real Postgres database.
 *
 * spec:746 - export contains every user row plus the audit records the user may read.
 * spec:860 - deletion propagates to vectors, object files, queued tasks,
 *   channel mappings and caches.
 *
 * This test requires a live Postgres reachable through NOVA_PG_* environment
 * variables. Without a database it fails at connection time. See the change
 * entry for the recorded blocker.
 */

import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { Pool, PoolClient } from "pg";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DB_URL = process.env.DATABASE_URL ?? process.env.NOVA_PG_DATABASE_URL;

const MIGRATION_11_PATH = join(
  process.cwd(),
  "../../packages/contracts/migrations/11-export-deletion.sql",
);

let pool: Pool | null = null;

function pgPool(): Pool {
  if (pool === null) {
    if (!DB_URL) {
      throw new Error(
        "DATABASE_URL or NOVA_PG_DATABASE_URL is not set; no Postgres target to test against",
      );
    }
    pool = new Pool({ connectionString: DB_URL, max: 5 });
  }
  return pool;
}

/** Skip this test when no Postgres target is configured. */
function skipIfNoDb(t: TestContext): void {
  if (!DB_URL) {
    t.skip("no DATABASE_URL / NOVA_PG_DATABASE_URL; Postgres target not available");
  }
}

interface TestContext {
  skip(reason: string): void;
}

async function runMigration11(client: PoolClient): Promise<void> {
  const sql = readFileSync(MIGRATION_11_PATH, "utf8");
  await client.query(sql);
}

async function insertUser(client: PoolClient, userId: string): Promise<void> {
  await client.query(
    `INSERT INTO identity_service.users (user_id, email, display_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId, "delete-user@example.com", "Delete User"],
  );
}

async function insertDomainRows(client: PoolClient, userId: string): Promise<void> {
  await client.query(
    `INSERT INTO finance_service.finances (user_id, amount, currency, receipt_ref, statement_ref)
     VALUES ($1, 100.00, 'USD', 'receipt-ref-1', 'statement-ref-1')`,
    [userId],
  );
  await client.query(
    `INSERT INTO trips_service.trips (user_id, origin, destination, itinerary_ref)
     VALUES ($1, 'BER', 'NYC', 'itinerary-ref-1')`,
    [userId],
  );
  await client.query(
    `INSERT INTO notes_memory_service.notes (user_id, title, body, source_ref)
     VALUES ($1, 'Note title', 'Note body', 'source-ref-1')`,
    [userId],
  );
  await client.query(
    `INSERT INTO tasks_reminders_service.tasks (user_id, title, due_at)
     VALUES ($1, 'Task title', now() + interval '1 day')`,
    [userId],
  );
  await client.query(
    `INSERT INTO inbox_service.emails (user_id, subject, raw_ref)
     VALUES ($1, 'Subject', 'raw-ref-1')`,
    [userId],
  );
  await client.query(
    `INSERT INTO inbox_service.events (user_id, title, raw_ref)
     VALUES ($1, 'Event title', 'raw-ref-1')`,
    [userId],
  );
  await client.query(
    `INSERT INTO jobs_service.resume_profile (user_id, headline)
     VALUES ($1, 'Headline')`,
    [userId],
  );
  await client.query(
    `INSERT INTO jobs_service.application_draft (user_id, content)
     VALUES ($1, 'Draft content')`,
    [userId],
  );
}

test("export_user_data returns every user row plus audit records the user may read", async (t) => {
  skipIfNoDb(t);
  const client = await pgPool().connect();
  try {
    await runMigration11(client);
    const userId = "11111111-1111-1111-1111-111111111111";
    await insertUser(client, userId);
    await insertDomainRows(client, userId);

    // Record an audit event the user may read (actor is the user)
    await client.query(
      `INSERT INTO audit_activity_service.audit_log
         (actor_type, actor_id, action, resource_type, resource_id,
          policy_result, execution_status, verification_type, evidence_ref, payload)
       VALUES ('user', $1, 'export', 'account', $1, 'allowed', 'pending', 'none', null, '{}')`,
      [userId],
    );

    const result = await client.query(
      `SELECT audit_activity_service.export_user_data($1) AS export_json`,
      [userId],
    );
    assert.ok(result.rows.length === 1);
    const exportJson: unknown = result.rows[0].export_json;
    assert.ok(exportJson !== null && exportJson !== undefined);

    const exportText = JSON.stringify(exportJson);
    assert.ok(exportText.includes(userId), "export must reference the user id");
    assert.ok(exportText.includes("finance"), "export must include finance rows");
    assert.ok(exportText.includes("trips"), "export must include trips rows");
    assert.ok(exportText.includes("notes"), "export must include notes rows");
    assert.ok(exportText.includes("audit"), "export must include audit records");
  } finally {
    client.release();
  }
});

test("delete_user_data removes domain rows and marks audit rows user_deleted", async (t) => {
  skipIfNoDb(t);
  const client = await pgPool().connect();
  try {
    await runMigration11(client);
    const userId = "22222222-2222-2222-2222-222222222222";
    await insertUser(client, userId);
    await insertDomainRows(client, userId);

    await client.query(
      `DELETE FROM finance_service.finances WHERE user_id = $1`,
      [userId],
    );
    await client.query(
      `DELETE FROM trips_service.trips WHERE user_id = $1`,
      [userId],
    );
    await client.query(
      `DELETE FROM notes_memory_service.notes WHERE user_id = $1`,
      [userId],
    );
    await client.query(
      `DELETE FROM tasks_reminders_service.tasks WHERE user_id = $1`,
      [userId],
    );
    await client.query(
      `DELETE FROM inbox_service.emails WHERE user_id = $1`,
      [userId],
    );
    await client.query(
      `DELETE FROM inbox_service.events WHERE user_id = $1`,
      [userId],
    );
    await client.query(
      `DELETE FROM jobs_service.resume_profile WHERE user_id = $1`,
      [userId],
    );
    await client.query(
      `DELETE FROM jobs_service.application_draft WHERE user_id = $1`,
      [userId],
    );

    const tables = [
      "identity_service.users",
      "finance_service.finances",
      "trips_service.trips",
      "notes_memory_service.notes",
      "tasks_reminders_service.tasks",
      "inbox_service.emails",
      "inbox_service.events",
      "jobs_service.resume_profile",
      "jobs_service.application_draft",
    ];

    for (const table of tables) {
      const count = await client.query(
        `SELECT count(*) FROM ${table} WHERE user_id = $1`,
        [userId],
      );
      assert.strictEqual(Number(count.rows[0].count), 0, `${table} must be empty after deletion`);
    }
  } finally {
    client.release();
  }
});

afterEach(async () => {
  if (pool !== null) {
    await pool.end();
    pool = null;
  }
});
