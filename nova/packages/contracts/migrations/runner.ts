/** The migration runner. It applies SQL files in order and records applied migrations. */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, extname, basename } from "node:path";

export interface Migration {
  readonly name: string;
  readonly sql: string;
  readonly branch: string;
}

export interface RunnerOptions {
  readonly dbUrl: string;
  readonly migrationsDir: string;
}

/** Read all .sql files from a directory, sorted by name. */
export function readMigrations(dir: string): Migration[] {
  const entries = readdirSync(dir)
    .filter((f) => extname(f) === ".sql")
    .sort();
  return entries.map((file) => {
    const path = resolve(dir, file);
    const sql = readFileSync(path, "utf8");
    const branch = basename(file).split("-")[0]; // e.g., "01", "02", etc.
    return { name: file, sql, branch };
  });
}

/** Create the migrations tracking table if it does not exist. */
const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS _migrations (
    name        TEXT PRIMARY KEY,
    branch      TEXT NOT NULL,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

/** Apply one migration inside a transaction. */
async function applyMigration(client: any, m: Migration): Promise<void> {
  await client.query("BEGIN");
  try {
    await client.query(m.sql);
    await client.query(
      "INSERT INTO _migrations (name, branch) VALUES ($1, $2)",
      [m.name, m.branch]
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }
}

/** Check if a migration is already applied. */
async function isApplied(client: any, name: string): Promise<boolean> {
  const res = await client.query("SELECT 1 FROM _migrations WHERE name = $1", [name]);
  return res.rowCount > 0;
}

/** Run all pending migrations in order. */
export async function migrate(opts: RunnerOptions): Promise<void> {
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: opts.dbUrl, max: 1 });
  const client = await pool.connect();
  try {
    await client.query(CREATE_TABLE_SQL);
    const migrations = readMigrations(opts.migrationsDir);
    for (const m of migrations) {
      if (await isApplied(client, m.name)) {
        console.log(`[migrate] skip ${m.name} (already applied)`);
        continue;
      }
      console.log(`[migrate] apply ${m.name} [branch ${m.branch}]`);
      await applyMigration(client, m);
    }
    console.log("[migrate] done");
  } finally {
    client.release();
    await pool.end();
  }
}

/** Roll back the last applied migration. Dangerous; only for local dev. */
export async function rollback(dbUrl: string, migrationsDir: string): Promise<void> {
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: dbUrl, max: 1 });
  const client = await pool.connect();
  try {
    const migrations = readMigrations(migrationsDir);
    if (migrations.length === 0) {
      console.log("[rollback] no migrations to roll back");
      return;
    }
    const last = migrations[migrations.length - 1];
    const res = await client.query(
      "SELECT name FROM _migrations WHERE name = $1",
      [last.name]
    );
    if (res.rowCount === 0) {
      console.log("[rollback] last migration not applied");
      return;
    }
    console.log(`[rollback] rolling back ${last.name}`);
    await client.query("DELETE FROM _migrations WHERE name = $1", [last.name]);
    console.log("[rollback] done (manual SQL rollback required)");
  } finally {
    client.release();
    await pool.end();
  }
}

/** Print the status of all migrations. */
export async function status(dbUrl: string, migrationsDir: string): Promise<void> {
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: dbUrl, max: 1 });
  const client = await pool.connect();
  try {
    await client.query(CREATE_TABLE_SQL);
    const migrations = readMigrations(migrationsDir);
    const applied = new Set(
      (await client.query("SELECT name FROM _migrations")).rows.map((r) => r.name)
    );
    for (const m of migrations) {
      console.log(`  ${applied.has(m.name) ? "[x]" : "[ ]"} ${m.name} (branch ${m.branch})`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}