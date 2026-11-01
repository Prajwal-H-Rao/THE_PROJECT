/**
 * Nova design system - Channels module.
 * Handles inbox and calendar channel communication.
 */

import { Module } from "@nestjs/common";
import { Pool } from "pg";

const PG_POOL = "PG_POOL";

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: () => new Pool({ connectionString: process.env.DATABASE_URL }),
    },
  ],
  exports: [PG_POOL],
})
export class ChannelsModule {}
