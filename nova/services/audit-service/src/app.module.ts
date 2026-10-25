/** The audit service application module. */

import { Module } from "@nestjs/common";
import { AuditModule } from "./audit.module.js";
import { HealthModule } from "./health/health.module.js";

@Module({
  imports: [AuditModule, HealthModule],
})
export class AppModule {}