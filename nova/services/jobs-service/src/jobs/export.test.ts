/** Tests for export/deletion (task 12.20). Mocks the pg Pool. */

import assert from "node:assert/strict";
import { test } from "node:test";
import { exportUserData, exportComplete, type UserRow } from "./export.js";

/** Build a mock query result. */
function result(rows: unknown[]) { return { rows }; }

/** Build a mock pool with query results per table. */
function mockPool(tableRows: Record<string, unknown[]>): { query: (sql: string, params: unknown[]) => Promise<{ rows: unknown[] }> } {
  return {
    query: async (_sql: string, _params: unknown[]) => {
      const lower = _sql.toLowerCase();
      if (lower.includes("application_submission")) {
        return result(tableRows.submissions ?? []);
      }
      if (lower.includes("application_draft")) {
        return result(tableRows.drafts ?? []);
      }
      if (lower.includes("resume_profile")) {
        return result(tableRows.profiles ?? []);
      }
      return result([]);
    },
  };
}

test("exportUserData returns rows from all three tables", async () => {
  const pool = mockPool({
    drafts: [{ id: "d-1", data: { draft_id: "d-1", user_id: "u-1", status: "ready" } }],
    submissions: [{ id: "s-1", data: { submission_id: "s-1", draft_id: "d-1", status: "submitted" } }],
    profiles: [{ id: "p-1", data: { profile_id: "p-1", user_id: "u-1", headline: "Engineer" } }],
  });

  const rows = await exportUserData(pool as any, "u-1");
  assert.equal(rows.length, 3);
  const tables = rows.map((r) => r.table);
  assert.ok(tables.includes("application_draft"));
  assert.ok(tables.includes("application_submission"));
  assert.ok(tables.includes("resume_profile"));
});

test("export with no data returns empty array", async () => {
  const pool = mockPool({ drafts: [], submissions: [], profiles: [] });
  const rows = await exportUserData(pool as any, "u-1");
  assert.equal(rows.length, 0);
});

test("exportComplete is true when all tables present", () => {
  const rows: UserRow[] = [
    { table: "application_draft", id: "d-1", data: {} },
    { table: "application_submission", id: "s-1", data: {} },
    { table: "resume_profile", id: "p-1", data: {} },
  ];
  assert.equal(exportComplete(rows), true);
});

test("exportComplete is false when a table is missing", () => {
  const rows: UserRow[] = [
    { table: "application_draft", id: "d-1", data: {} },
    { table: "resume_profile", id: "p-1", data: {} },
  ];
  assert.equal(exportComplete(rows), false);
});
