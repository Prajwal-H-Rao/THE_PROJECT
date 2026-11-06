/**
 * Tests for the employer alias repository.
 * Proves "no alias is silently discarded" at the repository level:
 * insert always persists and returns the row; list returns every row,
 * including unresolved (target NULL) and unreviewed ones.
 */

import { test } from "node:test";
import { deepStrictEqual, strictEqual } from "node:assert";
import { Pool } from "pg";
import { EmployerAliasRepository } from "./alias.repository.js";

// Build a stub pool returning canned rows for any query (repo precedent:
// tasks-reminders-service task.repository.test.ts mockPool pattern).
function mockPool(rows: unknown[]): Pool {
  return {
    query: async () => ({ rows, rowCount: rows.length, fields: [], command: "", oid: 0 }),
  } as unknown as Pool;
}

test("insertAlias persists and returns the row", async () => {
  const captured: unknown[] = [];
  const pool: Pool = {
    query: async (text: unknown, params: unknown[]) => {
      captured.push(params);
      return {
        rows: [
          {
            alias_id: "a1",
            source_employer_id: params[0],
            target_employer_id: params[1],
            alias_name: params[2],
            normalized_alias: params[3],
            alias_type: params[4],
            confidence: params[5],
            reviewed: false,
            reviewed_by: null,
            reviewed_at: null,
          },
        ],
        rowCount: 1,
        fields: [],
        command: "",
        oid: 0,
      };
    },
  } as unknown as Pool;
  const repository = new EmployerAliasRepository(pool);
  const row = await repository.insertAlias({
    sourceEmployerId: "src-1",
    targetEmployerId: null,
    aliasName: "TCS",
    normalizedAlias: "tcs",
    aliasType: "abbreviation",
    confidence: null,
  });
  strictEqual(row.aliasName, "TCS");
  strictEqual(row.targetEmployerId, null);
  strictEqual(row.reviewed, false);
  strictEqual(captured.length, 1);
});

test("listAliases returns every stored row, including unresolved", async () => {
  const rows = [
    {
      alias_id: "a1",
      source_employer_id: "src-1",
      target_employer_id: null,
      alias_name: "TCS",
      normalized_alias: "tcs",
      alias_type: "abbreviation",
      confidence: null,
      reviewed: false,
      reviewed_by: null,
      reviewed_at: null,
    },
    {
      alias_id: "a2",
      source_employer_id: "src-2",
      target_employer_id: "tgt-2",
      alias_name: "Infosys BPM",
      normalized_alias: "infosys-bpm",
      alias_type: "subsidiary",
      confidence: 0.9,
      reviewed: true,
      reviewed_by: "reviewer-1",
      reviewed_at: "2026-11-04T00:00:00Z",
    },
  ];
  const repository = new EmployerAliasRepository(mockPool(rows));
  const list = await repository.listAliases();
  strictEqual(list.length, 2);
  strictEqual(list[0].targetEmployerId, null);
  strictEqual(list[0].reviewed, false);
  strictEqual(list[1].targetEmployerId, "tgt-2");
  strictEqual(list[1].reviewed, true);
  deepStrictEqual(list.map((row) => row.aliasId), ["a1", "a2"]);
});
