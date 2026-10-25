/** The audit HTTP endpoints. Records and queries audit events. */

import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import type { AuditRecordInput, AuditRecordResponse, AuditRecord, AuditQuery } from "@nova/contracts/audit-contracts";
import { AuditService } from "./audit.service.js";

@ApiTags("audit")
@Controller("audit")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Post("record")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Record an audit event" })
  async record(@Body() input: AuditRecordInput): Promise<AuditRecordResponse> {
    if (!input.actorType || !input.actorId || !input.action || !input.resourceType || !input.policyResult || !input.policyVersion || !input.correlationId) {
      throw new BadRequestException({ error: "invalid_input", message: "Missing required fields" });
    }
    return this.auditService.recordDecision(input);
  }

  @Get("records")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Query audit records" })
  @ApiQuery({ name: "actorType", required: false, enum: ["user", "service", "system"] })
  @ApiQuery({ name: "actorId", required: false })
  @ApiQuery({ name: "action", required: false })
  @ApiQuery({ name: "resourceType", required: false })
  @ApiQuery({ name: "resourceId", required: false })
  @ApiQuery({ name: "policyResult", required: false, enum: ["allowed", "denied", "step_up", "error"] })
  @ApiQuery({ name: "from", required: false })
  @ApiQuery({ name: "to", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "offset", required: false })
  async find(
    @Query("actorType") actorType?: string,
    @Query("actorId") actorId?: string,
    @Query("action") action?: string,
    @Query("resourceType") resourceType?: string,
    @Query("resourceId") resourceId?: string,
    @Query("policyResult") policyResult?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ): Promise<{ records: AuditRecord[] }> {
    const query: AuditQuery = {
      actorType: actorType as "user" | "service" | "system" | undefined,
      actorId,
      action,
      resourceType,
      resourceId,
      policyResult: policyResult as "allowed" | "denied" | "step_up" | "error" | undefined,
      from,
      to,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };

    const records = await this.auditService.find(query);
    return { records };
  }
}