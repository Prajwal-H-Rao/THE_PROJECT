/** The audit Nest module. Wires the repository, service and controller. */

import { Module } from "@nestjs/common";
import { AuditController } from "./audit.controller.js";
import { AuditService } from "./audit.service.js";
import { SqlAuditRepository } from "./audit-repository.sql.js";
import { DbModule } from "./db/db.module.js";

@Module({
  imports: [DbModule],
  controllers: [AuditController],
  providers: [AuditService, SqlAuditRepository],
  exports: [AuditService],
})
export class AuditModule {}