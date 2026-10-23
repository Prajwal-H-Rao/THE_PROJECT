/** Test the migration runner. */

import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readMigrations } from "./runner.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, "..");
const testMigrationsDir = join(__dirname, "test-migrations");

describe("migration runner", () => {
  before(async () => {
    await mkdir(testMigrationsDir, { recursive: true });
    await writeFile(join(testMigrationsDir, "01-test.sql"), "CREATE TABLE test_table (id INT);");
    await writeFile(join(testMigrationsDir, "02-another.sql"), "CREATE TABLE another_table (name TEXT);");
  });

  after(async () => {
    await rm(testMigrationsDir, { recursive: true, force: true });
  });

  it("readMigrations returns sorted migrations with branch", () => {
    const migrations = readMigrations(testMigrationsDir);
    assert.strictEqual(migrations.length, 2);
    assert.strictEqual(migrations[0].name, "01-test.sql");
    assert.strictEqual(migrations[0].branch, "01");
    assert.strictEqual(migrations[1].name, "02-another.sql");
    assert.strictEqual(migrations[1].branch, "02");
  });

  it("readMigrations ignores non-sql files", async () => {
    await writeFile(join(testMigrationsDir, "README.md"), "# test");
    const migrations = readMigrations(testMigrationsDir);
    assert.strictEqual(migrations.length, 2); // still only 2 .sql files
    await rm(join(testMigrationsDir, "README.md"), { force: true });
  });
});