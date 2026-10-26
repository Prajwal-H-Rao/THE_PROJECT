/** SQL audit repository using the audit_activity_service.audit_log table. */

import { Injectable, Inject } from "@nestjs/common";
import { Pool, PoolClient } from "pg";
import {
  AuditRecordInput,
  AuditRecordResponse,
  AuditRecord,
  AuditRepository,
  AuditQuery,
  PolicyResult,
  ActorType,
} from "@nova/contracts/audit-contracts";

@Injectable()
export class SqlAuditRepository implements AuditRepository {
  constructor(@Inject("PG_POOL") private readonly pool: Pool) {}

  async record(input: AuditRecordInput): Promise<AuditRecordResponse> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const result = await client.query(
        `INSERT INTO audit_activity_service.audit_log
           (actor_type, actor_id, action, resource_type, resource_id,
            policy_result, execution_status, verification_type, evidence_ref, payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING audit_id, row_hash`,
        [
          input.actorType,
          input.actorId,
          input.action,
          input.resourceType,
          input.resourceId ?? null,
          input.policyResult,
          input.executionStatus ?? "succeeded",
          input.verificationType ?? "none",
          input.evidenceRef ?? null,
          JSON.stringify(input.payload ?? {}),
        ]
      );

      await client.query("COMMIT");

      const row = result.rows[0];
      return { ok: true, auditId: row.audit_id, rowHash: row.row_hash };
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  async find(query: AuditQuery): Promise<AuditRecord[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (query.actorType) {
      conditions.push(`actor_type = $${paramIndex++}`);
      params.push(query.actorType);
    }
    if (query.actorId) {
      conditions.push(`actor_id = $${paramIndex++}`);
      params.push(query.actorId);
    }
    if (query.action) {
      conditions.push(`action = $${paramIndex++}`);
      params.push(query.action);
    }
    if (query.resourceType) {
      conditions.push(`resource_type = $${paramIndex++}`);
      params.push(query.resourceType);
    }
    if (query.resourceId) {
      conditions.push(`resource_id = $${paramIndex++}`);
      params.push(query.resourceId);
    }
    if (query.policyResult) {
      conditions.push(`policy_result = $${paramIndex++}`);
      params.push(query.policyResult);
    }
    if (query.from) {
      conditions.push(`occurred_at >= $${paramIndex++}`);
      params.push(query.from);
    }
    if (query.to) {
      conditions.push(`occurred_at <= $${paramIndex++}`);
      params.push(query.to);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    params.push(query.limit ?? 100, query.offset ?? 0);

    const result = await this.pool.query(
      `SELECT audit_id, occurred_at, actor_type, actor_id, action, resource_type,
              resource_id, policy_result, execution_status, verification_type,
              evidence_ref, payload, previous_hash, row_hash
       FROM audit_activity_service.audit_log
       ${whereClause}
       ORDER BY occurred_at DESC, audit_id DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    return result.rows.map((r) => ({
      auditId: r.audit_id,
      occurredAt: r.occurred_at instanceof Date ? r.occurred_at.toISOString() : r.occurred_at,
      actorType: r.actor_type as ActorType,
      actorId: r.actor_id,
      action: r.action,
      resourceType: r.resource_type,
      resourceId: r.resource_id ?? undefined,
      policyResult: r.policy_result as PolicyResult,
      executionStatus: r.execution_status as "pending" | "succeeded" | "failed" | "compensated",
      verificationType: r.verification_type as "none" | "signature" | "receipt" | "external" | "human",
      evidenceRef: r.evidence_ref ?? undefined,
      payload: r.payload,
      previousHash: r.previous_hash ?? undefined,
      rowHash: r.row_hash,
    }));
  }

  async verifyChain(fromAuditId?: string): Promise<string | null> {
    const result = await this.pool.query(
      `SELECT * FROM audit_activity_service.verify_hash_chain($1)`,
      [fromAuditId ?? null]
    );
    return result.rows[0] ?? null;
  }
}