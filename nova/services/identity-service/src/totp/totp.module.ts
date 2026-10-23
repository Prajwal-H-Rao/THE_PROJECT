/** TOTP module. */

import { Module } from "@nestjs/common";
import { TotpService } from "./totp.service.js";
import { TotpController } from "./totp.controller.js";
import { SessionModule } from "../session/session.module.js";
import { DbModule } from "../db/db.module.js";

@Module({
  imports: [SessionModule, DbModule],
  controllers: [TotpController],
  providers: [TotpService],
  exports: [TotpService],
})
export class TotpModule {}