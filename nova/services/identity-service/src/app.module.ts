/** The root application module. */

import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module.js";
import { SessionModule } from "./session/session.module.js";
import { TotpModule } from "./totp/totp.module.js";
import { AccountModule } from "./account/account.module.js";
import { HealthModule } from "./health/health.module.js";
import { DbModule } from "./db/db.module.js";

@Module({
  imports: [AuthModule, SessionModule, TotpModule, AccountModule, HealthModule, DbModule],
})
export class AppModule {}