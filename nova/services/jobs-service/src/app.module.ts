/**
 * Nova design system - Root application module for jobs-service.
 */

import { Module, Global } from "@nestjs/common";
import { Pool } from "pg";
import { TasksModule } from "./tasks/tasks.module.js";
import { ProfileModule } from "./profile/profile.module.js";
import { JobsModule } from "./jobs/jobs.module.js";

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
  imports: [TasksModule, ProfileModule, JobsModule],
})
export class AppModule {}
