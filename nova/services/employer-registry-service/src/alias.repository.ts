/**
 * Nova design system - Employer Registry service.
 * EmployerAliasRepository: records and lists alias relationships.
 * No alias is silently discarded: insert always persists and returns the
 * row; list returns every stored row, including unresolved (target NULL)
 * and unreviewed ones. SQL is parameterized end to end.
 */

import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { EmployerAlias } from "./alias.entity.js";

// Insert input: alias_id and review columns are system-managed on insert.
interface AliasInsertInput {
  sourceEmployerId: string;
  targetEmployerId: string | null;
  aliasName: string;
  normalizedAlias: string;
  aliasType: string;
  confidence: number | null;
}

@Injectable()
export class EmployerAliasRepository {
  constructor(@Inject("PG_POOL") private readonly pool: Pool) {}

  // Insert one alias row and return it as persisted. Never drops or dedupes.
  async insertAlias(input: AliasInsertInput): Promise<EmployerAlias> {
    const query = `
      INSERT INTO employer_registry_service.employer_aliases
        (source_employer_id, target_employer_id, alias_name, normalized_alias,
         alias_type, confidence, reviewed, reviewed_by, reviewed_at)
      VALUES ($1, $2, $3, $4, $5, $6, false, NULL, NULL)
      RETURNING alias_id, source_employer_id, target_employer_id, alias_name,
                normalized_alias, alias_type, confidence, reviewed,
                reviewed_by, reviewed_at
    `;
    const result = await this.pool.query(query, [
      input.sourceEmployerId,
      input.targetEmployerId,
      input.aliasName,
      input.normalizedAlias,
      input.aliasType,
      input.confidence,
    ]);
    // noUncheckedIndexedAccess: rows[0] is possibly undefined.
    const row = result.rows[0];
    if (!row) {
      throw new Error("insertAlias returned no row");
    }
    return {
      aliasId: row.alias_id,
      sourceEmployerId: row.source_employer_id,
      targetEmployerId: row.target_employer_id,
      aliasName: row.alias_name,
      normalizedAlias: row.normalized_alias,
      aliasType: row.alias_type,
      confidence: row.confidence,
      reviewed: row.reviewed,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
    };
  }

  // Return every stored alias row. Filters nothing: unresolved targets and
  // unreviewed rows are included, so no alias can be silently discarded.
  async listAliases(): Promise<EmployerAlias[]> {
    const query = `
      SELECT alias_id, source_employer_id, target_employer_id, alias_name,
             normalized_alias, alias_type, confidence, reviewed,
             reviewed_by, reviewed_at
      FROM employer_registry_service.employer_aliases
      ORDER BY alias_id
    `;
    const result = await this.pool.query(query);
    return result.rows.map((row) => ({
      aliasId: row.alias_id,
      sourceEmployerId: row.source_employer_id,
      targetEmployerId: row.target_employer_id,
      aliasName: row.alias_name,
      normalizedAlias: row.normalized_alias,
      aliasType: row.alias_type,
      confidence: row.confidence,
      reviewed: row.reviewed,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
    }));
  }
}

export { AliasInsertInput };
