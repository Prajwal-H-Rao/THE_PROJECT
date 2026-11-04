/**
 * Nova design system - Remembered fact repository.
 * Runs SQL queries against notes_memory_service.remembered_facts.
 * All read queries filter by user_id. Ownership enforced on every operation.
 */

import { Injectable, Inject } from "@nestjs/common";
import { Pool } from "pg";
import type {
  RememberedFact,
  CreateFactInput,
  UpdateFactInput,
  FactListFilter,
} from "./fact.entity.js";

const FACTS_TABLE = "notes_memory_service.remembered_facts";

@Injectable()
export class FactRepository {
  constructor(@Inject("PG_POOL") private readonly pool: Pool) {}

  /** Create one remembered fact for one user. */
  async create(userId: string, input: CreateFactInput): Promise<RememberedFact> {
    const query = `
      INSERT INTO ${FACTS_TABLE}
        (user_id, fact_text, source_type, source_ref)
      VALUES ($1, $2, $3, $4)
      RETURNING fact_id, user_id, fact_text, source_type, source_ref,
                embedding, is_archived, created_at, updated_at
    `;
    const values = [
      userId,
      input.factText,
      input.sourceType ?? null,
      input.sourceRef ?? null,
    ];
    const result = await this.pool.query(query, values);
    return this.mapRow(result.rows[0]);
  }

  /** Read one fact by ID only if the user owns it. */
  async getFact(userId: string, factId: string): Promise<RememberedFact | null> {
    const query = `
      SELECT fact_id, user_id, fact_text, source_type, source_ref,
             embedding, is_archived, created_at, updated_at
      FROM ${FACTS_TABLE}
      WHERE fact_id = $2 AND user_id = $1
    `;
    const result = await this.pool.query(query, [userId, factId]);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  /** List facts for one user with optional source/archive filter. */
  async listFacts(userId: string, filter?: FactListFilter): Promise<RememberedFact[]> {
    let query = `
      SELECT fact_id, user_id, fact_text, source_type, source_ref,
             embedding, is_archived, created_at, updated_at
      FROM ${FACTS_TABLE}
      WHERE user_id = $1
    `;
    const values: unknown[] = [userId];
    let paramIndex = 2;

    if (filter?.sourceType && filter.sourceType.length > 0) {
      query += ` AND source_type = ANY($${paramIndex})`;
      values.push(filter.sourceType);
      paramIndex++;
    }
    if (filter?.isArchived !== undefined) {
      query += ` AND is_archived = $${paramIndex}`;
      values.push(filter.isArchived);
      paramIndex++;
    }

    query += " ORDER BY updated_at DESC";
    const result = await this.pool.query(query, values);
    return result.rows.map((row) => this.mapRow(row));
  }

  /** Update one fact only if the user owns it. */
  async updateFact(
    userId: string,
    factId: string,
    input: UpdateFactInput,
  ): Promise<RememberedFact | null> {
    const sets: string[] = [];
    const values: unknown[] = [userId, factId];
    let paramIndex = 3;

    if (input.factText !== undefined) {
      sets.push(`fact_text = $${paramIndex}`);
      values.push(input.factText);
      paramIndex++;
    }
    if (input.sourceType !== undefined) {
      sets.push(`source_type = $${paramIndex}`);
      values.push(input.sourceType);
      paramIndex++;
    }
    if (input.sourceRef !== undefined) {
      sets.push(`source_ref = $${paramIndex}`);
      values.push(input.sourceRef);
      paramIndex++;
    }
    if (input.isArchived !== undefined) {
      sets.push(`is_archived = $${paramIndex}`);
      values.push(input.isArchived);
      paramIndex++;
    }

    if (sets.length === 0) {
      return this.getFact(userId, factId);
    }

    sets.push(`updated_at = now()`);
    const query = `
      UPDATE ${FACTS_TABLE} SET ${sets.join(", ")}
      WHERE fact_id = $2 AND user_id = $1
      RETURNING fact_id, user_id, fact_text, source_type, source_ref,
                embedding, is_archived, created_at, updated_at
    `;
    const result = await this.pool.query(query, values);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  /** Soft-delete one fact (archive) only if the user owns it. */
  async archiveFact(userId: string, factId: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE ${FACTS_TABLE} SET is_archived = true, updated_at = now()
       WHERE fact_id = $2 AND user_id = $1 AND is_archived = false
       RETURNING fact_id`,
      [userId, factId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  /** Hard-delete one fact (forget) only if the user owns it.
   * Removes the row and its inline vector entirely. */
  async forgetFact(userId: string, factId: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM ${FACTS_TABLE} WHERE fact_id = $2 AND user_id = $1 RETURNING fact_id`,
      [userId, factId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  private mapRow(row: unknown): RememberedFact {
    const r = row as Record<string, unknown>;
    return {
      factId: String(r.fact_id),
      userId: String(r.user_id),
      factText: String(r.fact_text),
      sourceType: r.source_type === null ? null : String(r.source_type),
      sourceRef: r.source_ref === null ? null : String(r.source_ref),
      embedding:
        r.embedding === null ? null : Array.isArray(r.embedding) ? r.embedding : (r.embedding as unknown as number[]),
      isArchived: Boolean(r.is_archived),
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    };
  }
}
