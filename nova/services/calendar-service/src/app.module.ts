/**
 * Root application module for calendar-service.
 */

import { Module, Global } from "@nestjs/common";
import { Pool } from "pg";
import { CalendarEventService } from "./calendar.service.js";

const PG_POOL = "PG_POOL";

@Global()
@Module({
  providers: [{ provide: PG_POOL, useFactory: () => new Pool({ connectionString: process.env.DATABASE_URL }) }, CalendarEventService],
  exports: [PG_POOL, CalendarEventService],
})
export class AppModule {}
