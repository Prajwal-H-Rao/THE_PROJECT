/**
 * Root application module for notification-service.
 */

import { Module, Global } from "@nestjs/common";
import { Pool } from "pg";
import { NotificationsModule } from "./notifications/notifications.module.js";

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
  imports: [NotificationsModule],
})
export class AppModule {}
