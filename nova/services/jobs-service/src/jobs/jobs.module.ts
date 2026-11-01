/**
 * Nova design system - Jobs module.
 */

import { Module } from "@nestjs/common";
import { Pool } from "pg";
import { JobService } from "./jobs/job.service.js";

const PG_POOL = "PG_POOL";

@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: () => new Pool({ connectionString: process.env.DATABASE_URL }),
    },
    JobService,
  ],
  exports: [JobService],
})
export class JobsModule {}
