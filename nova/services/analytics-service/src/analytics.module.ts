/**
 * Nova design system - Analytics module.
 */

import { Module } from "@nestjs/common";
import { Pool } from "pg";
import { AnalyticsService } from "./analytics.service.js";

const PG_POOL = "PG_POOL";

@Global()
@Module({
  providers: [{ provide: PG_POOL, useFactory: () => new Pool({ connectionString: process.env.DATABASE_URL }) }, AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
