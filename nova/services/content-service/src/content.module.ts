/**
 * Nova design system - Content module.
 */

import { Module } from "@nestjs/common";
import { Pool } from "pg";
import { ContentService } from "./content.service.js";

const PG_POOL = "PG_POOL";

@Global()
@Module({
  providers: [{ provide: PG_POOL, useFactory: () => new Pool({ connectionString: process.env.DATABASE_URL }) }, ContentService],
  exports: [ContentService],
})
export class ContentModule {}
