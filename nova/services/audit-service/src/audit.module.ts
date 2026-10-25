/** The audit Nest module. Wires the repository, service and controller. */

import { Module } from "@nestjs/common";
import { AuditController } from "./audit.controller.js";
import { AuditService } from "./audit.service.js";
import { InMemoryAuditRepository } from "./audit-repository.js";

@Module({
  controllers: [AuditController],
  providers: [AuditService, InMemoryAuditRepository],
  exports: [AuditService],
})
export class AuditModule {}