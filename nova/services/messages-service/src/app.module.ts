/**
 * Root application module for messages-service.
 */

import { Module, Global } from "@nestjs/common";
import { Pool } from "pg";
import { MessagesModule } from "./messages.module.js";

const PG_POOL = "PG_POOL";

@Global()
@Module({
  providers: [{ provide: PG_POOL, useFactory: () => new Pool({ connectionString: process.env.DATABASE_URL }) }],
  exports: [PG_POOL],
  imports: [MessagesModule],
})
export class AppModule {}
