/**
 * Shared fake pg pool for note search tests.
 * Dispatches canned rows on distinct SQL substrings and records every query.
 */

import type { Pool } from "pg";

export interface FakeRoute {
  /** Distinct substring that identifies the query kind. */
  match: string;
  rows: Record<string, unknown>[];
}

export interface FakeQuery {
  sql: string;
  values: unknown[];
}

/** Build a pool-like object. Routes match by substring; unknown SQL throws. */
export function makeFakePool(routes: FakeRoute[]) {
  const queries: FakeQuery[] = [];
  const pool = {
    async query(sql: string, values?: unknown[]) {
      queries.push({ sql, values: values ?? [] });
      const route = routes.find((r) => sql.includes(r.match));
      if (!route) throw new Error(`Unexpected SQL: ${sql}`);
      return { rows: route.rows, rowCount: route.rows.length };
    },
  };
  return { pool: pool as unknown as Pool, queries };
}

/** Build a pgvector text string filled with one repeated value. */
export function vectorText(value: number): string {
  return JSON.stringify(Array.from({ length: 384 }, () => value));
}
