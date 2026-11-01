/**
 * Nova design system - Release gate module.
 */

import { Module } from "@nestjs/common";
import { Pool } from "pg";
import { ReleaseGateService } from "./release-gate.service.js";

const PG_POOL = "PG_POOL";

@Global()
@Module({
  providers: [{ provide: PG_POOL, useFactory: () => new Pool({ connectionString: process.env.DATABASE_URL }) }, ReleaseGateService],
  exports: [ReleaseGateService],
})
export class ReleaseGateModule {}
