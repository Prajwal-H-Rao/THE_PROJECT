/** Account module. */

import { Module } from "@nestjs/common";
import { UserRepository } from "./user.repository.js";
import { TotpService } from "../totp/totp.service.js";
import { DbModule } from "../db/db.module.js";

@Module({
  imports: [DbModule],
  providers: [UserRepository, TotpService],
  exports: [UserRepository, TotpService],
})
export class AccountModule {}