/**
 * Nova design system - Deployment module.
 */

import { Module } from "@nestjs/common";
import { Pool } from "pg";
import { DeploymentService } from "./deployment.service.js";

const PG_POOL = "PG_POOL";

@Global()
@Module({
  providers: [{ provide: PG_POOL, useFactory: () => new Pool({ connectionString: process.env.DATABASE_URL }) }, DeploymentService],
  exports: [DeploymentService],
})
export class DeploymentModule {}
