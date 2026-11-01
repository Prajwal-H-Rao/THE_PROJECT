/**
 * Root application module for tasks-reminders-service.
 * Provides PG_POOL injection token for the task repository.
 */

import { Module, Global } from "@nestjs/common";
import { Pool } from "pg";
import { TasksModule } from "./tasks/tasks.module.js";

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
  imports: [TasksModule],
})
export class AppModule {}
