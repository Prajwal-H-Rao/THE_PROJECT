/**
 * Root application module for release-gate-service.
 */

import { Module, Global } from "@nestjs/common";
import { Pool } from "pg";
import { ReleaseGateModule } from "./release-gate.module.js";

const PG_POOL = "PG_POOL";

@Global()
@Module({
  providers: [{ provide: PG_POOL, useFactory: () => new Pool({ connectionString: process.env.DATABASE_URL }) }],
  exports: [PG_POOL],
  imports: [ReleaseGateModule],
})
export class AppModule {}
