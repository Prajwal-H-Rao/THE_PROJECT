/** The audit service. Records policy decisions with version and correlation ID.
 *  Provides HTTP endpoints for recording and querying audit events. */

import { Injectable } from "@nestjs/common";
import {
  AuditRecordInput,
  AuditRecordResponse,
  AuditRecord,
  AuditQuery,
  PolicyResult,
  ActorType,
} from "@nova/contracts/audit-contracts";
import type { AuditRepository } from "@nova/contracts/audit-contracts";
import { InMemoryAuditRepository } from "./audit-repository.js";

@Injectable()
export class AuditService {
  constructor(private readonly repository: AuditRepository) {}

  /** Record an audit event for a policy decision. */
  async recordDecision(input: AuditRecordInput): Promise<AuditRecordResponse> {
    return this.repository.record(input);
  }

  /** Record an allowed decision. */
  async recordAllow(
    actorType: ActorType,
    actorId: string,
    action: string,
    resourceType: string,
    policyVersion: string | number,
    correlationId: string,
    resourceId?: string,
    payload?: Record<string, unknown>
  ): Promise<AuditRecordResponse> {
    return this.recordDecision({
      actorType,
      actorId,
      action,
      resourceType,
      resourceId,
      policyResult: "allowed",
      policyVersion,
      correlationId,
      payload,
    });
  }

  /** Record a denied decision. */
  async recordDeny(
    actorType: ActorType,
    actorId: string,
    action: string,
    resourceType: string,
    policyVersion: string | number,
    correlationId: string,
    resourceId?: string,
    payload?: Record<string, unknown>
  ): Promise<AuditRecordResponse> {
    return this.recordDecision({
      actorType,
      actorId,
      action,
      resourceType,
      resourceId,
      policyResult: "denied",
      policyVersion,
      correlationId,
      payload,
    });
  }

  /** Query audit records. */
  async find(query: AuditQuery): Promise<AuditRecord[]> {
    return this.repository.find(query);
  }
}