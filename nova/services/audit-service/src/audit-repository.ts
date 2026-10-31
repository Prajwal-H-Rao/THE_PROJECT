/** The audit service. Records policy decisions with version and correlation ID.
 *  Uses in-memory storage because Postgres is unavailable locally. */

import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import {
  AuditRecordInput,
  AuditRecordResponse,
  AuditRecord,
  AuditRepository,
  AuditQuery,
  PolicyResult,
  ActorType,
} from "@nova/contracts/audit-contracts";
import { createHash } from "node:crypto";

/** Compute SHA-256 hash of a string. */
function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** In-memory audit repository. Declared stub; SQL adapter swaps in later. */
@Injectable()
export class InMemoryAuditRepository implements AuditRepository {
  private readonly records: AuditRecord[] = [];
  private previousHash: string | null = null;

  async record(input: AuditRecordInput): Promise<AuditRecordResponse> {
    const auditId = randomUUID();
    const occurredAt = new Date().toISOString();

    // Build the hash chain input
    const chainInput = [
      this.previousHash ?? "",
      auditId,
      occurredAt,
      input.actorType,
      input.actorId,
      input.action,
      input.resourceType,
      input.resourceId ?? "",
      input.policyResult,
      input.executionStatus ?? "succeeded",
      input.verificationType ?? "none",
      input.evidenceRef ?? "",
      JSON.stringify(input.payload ?? {}),
    ].join("|");

    const rowHash = sha256(chainInput);

    const record: AuditRecord = {
      auditId,
      occurredAt,
      actorType: input.actorType,
      actorId: input.actorId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      policyResult: input.policyResult,
      denialCode: input.denialCode,
      executionStatus: input.executionStatus ?? "succeeded",
      verificationType: input.verificationType ?? "none",
      evidenceRef: input.evidenceRef,
      payload: input.payload ?? {},
      previousHash: this.previousHash ?? undefined,
      rowHash,
    };

    this.records.push(record);
    this.previousHash = rowHash;

    return { ok: true, auditId, rowHash };
  }

  async find(query: AuditQuery): Promise<AuditRecord[]> {
    let results = this.records;

    if (query.actorType) {
      results = results.filter((r) => r.actorType === query.actorType);
    }
    if (query.actorId) {
      results = results.filter((r) => r.actorId === query.actorId);
    }
    if (query.action) {
      results = results.filter((r) => r.action === query.action);
    }
    if (query.resourceType) {
      results = results.filter((r) => r.resourceType === query.resourceType);
    }
    if (query.resourceId) {
      results = results.filter((r) => r.resourceId === query.resourceId);
    }
    if (query.policyResult) {
      results = results.filter((r) => r.policyResult === query.policyResult);
    }
    if (query.from) {
      results = results.filter((r) => r.occurredAt >= query.from!);
    }
    if (query.to) {
      results = results.filter((r) => r.occurredAt <= query.to!);
    }

    // Sort by occurredAt descending
    results = results.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

    const offset = query.offset ?? 0;
    const limit = query.limit ?? 100;
    return results.slice(offset, offset + limit);
  }
}

/** Test-only repository that simulates async behavior. */
@Injectable()
export class TestAuditRepository implements AuditRepository {
  private readonly records: AuditRecord[] = [];
  private previousHash: string | null = null;

  async record(input: AuditRecordInput): Promise<AuditRecordResponse> {
    await Promise.resolve(); // simulate async
    const auditId = randomUUID();
    const occurredAt = new Date().toISOString();

    const chainInput = [
      this.previousHash ?? "",
      auditId,
      occurredAt,
      input.actorType,
      input.actorId,
      input.action,
      input.resourceType,
      input.resourceId ?? "",
      input.policyResult,
      input.executionStatus ?? "succeeded",
      input.verificationType ?? "none",
      input.evidenceRef ?? "",
      JSON.stringify(input.payload ?? {}),
    ].join("|");

    const rowHash = sha256(chainInput);

    const record: AuditRecord = {
      auditId,
      occurredAt,
      actorType: input.actorType,
      actorId: input.actorId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      policyResult: input.policyResult,
      denialCode: input.denialCode,
      executionStatus: input.executionStatus ?? "succeeded",
      verificationType: input.verificationType ?? "none",
      evidenceRef: input.evidenceRef,
      payload: input.payload ?? {},
      previousHash: this.previousHash ?? undefined,
      rowHash,
    };

    this.records.push(record);
    this.previousHash = rowHash;

    return { ok: true, auditId, rowHash };
  }

  async find(query: AuditQuery): Promise<AuditRecord[]> {
    await Promise.resolve();
    let results = this.records;

    if (query.actorType) {
      results = results.filter((r) => r.actorType === query.actorType);
    }
    if (query.actorId) {
      results = results.filter((r) => r.actorId === query.actorId);
    }
    if (query.action) {
      results = results.filter((r) => r.action === query.action);
    }
    if (query.resourceType) {
      results = results.filter((r) => r.resourceType === query.resourceType);
    }
    if (query.resourceId) {
      results = results.filter((r) => r.resourceId === query.resourceId);
    }
    if (query.policyResult) {
      results = results.filter((r) => r.policyResult === query.policyResult);
    }
    if (query.from) {
      results = results.filter((r) => r.occurredAt >= query.from!);
    }
    if (query.to) {
      results = results.filter((r) => r.occurredAt <= query.to!);
    }

    results = results.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

    const offset = query.offset ?? 0;
    const limit = query.limit ?? 100;
    return results.slice(offset, offset + limit);
  }
}