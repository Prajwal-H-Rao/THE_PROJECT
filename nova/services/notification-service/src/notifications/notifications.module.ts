/**
 * Nova design system - Notifications module.
 */

import { Module } from "@nestjs/common";
import { Pool } from "pg";
import { NotificationService } from "./notifications/notification.service.js";

const PG_POOL = "PG_POOL";

@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: () => new Pool({ connectionString: process.env.DATABASE_URL }),
    },
    NotificationService,
  ],
  exports: [NotificationService],
})
export class NotificationsModule {}
