/**
 * Root application module for deployment-service.
 */

import { Module, Global } from "@nestjs/common";
import { Pool } from "pg";
import { DeploymentModule } from "./deployment.module.js";

const PG_POOL = "PG_POOL";

@Global()
@Module({
  providers: [{ provide: PG_POOL, useFactory: () => new Pool({ connectionString: process.env.DATABASE_URL }) }],
  exports: [PG_POOL],
  imports: [DeploymentModule],
})
export class AppModule {}
