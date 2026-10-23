/** Session module. */

import { Module } from "@nestjs/common";
import { SessionRepository } from "./session.repository.js";
import { SessionService } from "./session.service.js";
import { DbModule } from "../db/db.module.js";

@Module({
  imports: [DbModule],
  providers: [SessionRepository, SessionService],
  exports: [SessionRepository, SessionService],
})
export class SessionModule {}