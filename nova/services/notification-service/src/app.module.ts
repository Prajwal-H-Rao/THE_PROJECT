/**
 * Root application module for notification-service.
 * Provides PG_POOL injection token for the reminder repository.
 */

import { Module, Global } from "@nestjs/common";
import { Pool } from "pg";
import { RemindersModule } from "./reminders/reminders.module.js";

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
  imports: [RemindersModule],
})
export class AppModule {}
