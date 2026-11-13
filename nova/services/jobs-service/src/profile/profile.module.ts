/** The profile module. It wires ProfileService and exports it for the app module. */

import { Module } from "@nestjs/common";
import { ProfileService } from "./profile.service.js";

@Module({
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
