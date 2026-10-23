/** Auth module. */

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthController } from "./auth.controller.js";
import { OidcService } from "./oidc.service.js";
import { OidcStateStore } from "./oidc-state.store.js";
import { SessionModule } from "../session/session.module.js";
import { AccountModule } from "../account/account.module.js";
import { DbModule } from "../db/db.module.js";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), SessionModule, AccountModule, DbModule],
  controllers: [AuthController],
  providers: [OidcService, OidcStateStore],
  exports: [OidcService, OidcStateStore],
})
export class AuthModule {}