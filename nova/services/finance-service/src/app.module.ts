/**
 * Nova design system - Finance service root module.
 */

import { Module, Global } from "@nestjs/common";
import { Pool } from "pg";
import { FinanceModule } from "./finance.module.js";

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
  imports: [FinanceModule],
})
export class AppModule {}
