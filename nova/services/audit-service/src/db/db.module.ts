/** Database module providing a Postgres connection pool. */

import { Module, Global } from "@nestjs/common";
import { Pool } from "pg";

@Global()
@Module({
  providers: [
    {
      provide: "PG_POOL",
      useFactory: () => {
        const pool = new Pool({
          host: process.env.PGHOST ?? "localhost",
          port: parseInt(process.env.PGPORT ?? "5432", 10),
          user: process.env.PGUSER ?? "audit_activity_service",
          password: process.env.PGPASSWORD ?? "nova-local-audit-activity-service",
          database: process.env.PGDATABASE ?? "nova",
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        });
        pool.on("error", (err) => {
          console.error("Unexpected PG pool error", err);
        });
        return pool;
      },
    },
  ],
  exports: ["PG_POOL"],
})
export class DbModule {}