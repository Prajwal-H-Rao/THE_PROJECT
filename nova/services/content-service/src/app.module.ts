/**
 * Root application module for content-service.
 */

import { Module, Global } from "@nestjs/common";
import { Pool } from "pg";
import { ContentModule } from "./content.module.js";

const PG_POOL = "PG_POOL";

@Global()
@Module({
  providers: [{ provide: PG_POOL, useFactory: () => new Pool({ connectionString: process.env.DATABASE_URL }) }],
  exports: [PG_POOL],
  imports: [ContentModule],
})
export class AppModule {}
