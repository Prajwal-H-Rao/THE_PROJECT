/** Auth module. */

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthController } from "./auth.controller.js";
import { PasswordResetController } from "./password-reset.controller.js";
import { OidcService } from "./oidc.service.js";
import { PasswordResetService } from "./password-reset.service.js";
import { RefreshTokenService } from "./refresh-token.service.js";
import { OidcStateStore } from "./oidc-state.store.js";
import { SessionModule } from "../session/session.module.js";
import { AccountModule } from "../account/account.module.js";
import { DbModule } from "../db/db.module.js";
import { ScopeService } from "./scope.service.js";
import { AccountLinkingService } from "./account-linking.service.js";
import { KeyRotationService } from "./key-rotation.service.js";
import { UnlinkRevokeService } from "./unlink-revoke.service.js";
import { RateLimitingService } from "./rate-limiting.service.js";
import { RbacService } from "./rbac.service.js";
import { TotpService } from "../totp/totp.service.js";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), SessionModule, AccountModule, DbModule],
  controllers: [AuthController, PasswordResetController],
  providers: [
    OidcService,
    PasswordResetService,
    RefreshTokenService,
    OidcStateStore,
    ScopeService,
    AccountLinkingService,
    KeyRotationService,
    UnlinkRevokeService,
    RateLimitingService,
    RbacService,
    TotpService
  ],
  exports: [
    OidcService,
    OidcStateStore,
    PasswordResetService,
    RefreshTokenService,
    ScopeService,
    AccountLinkingService,
    KeyRotationService,
    UnlinkRevokeService,
    RateLimitingService,
    RbacService
  ],
})
export class AuthModule {}