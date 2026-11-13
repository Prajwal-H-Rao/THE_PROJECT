/**
 * Nova design system - Employer Registry module.
 * Manages employer registry with per-employer targeting and verification.
 */

import { Module, Global } from "@nestjs/common";
import { Pool } from "pg";
import { CircuitBreaker } from "./circuit-breaker.js";

const PG_POOL = "PG_POOL";

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: () => new Pool({ connectionString: process.env.DATABASE_URL }),
    },
    {
      provide: "CIRCUIT_BREAKER",
      useFactory: () => new CircuitBreaker("employer-registry", 5, 30000, 3),
    },
  ],
  exports: [PG_POOL, "CIRCUIT_BREAKER"],
})
export class AppModule {}
