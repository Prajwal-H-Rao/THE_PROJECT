/** The policy module. */

import { Module } from "@nestjs/common";
import { PolicyDecisionService } from "./policy-decision.service.js";
import { PolicyController } from "./policy.controller.js";
import { PolicyAdminController } from "./policy-admin.controller.js";

@Module({
  controllers: [PolicyController, PolicyAdminController],
  providers: [PolicyDecisionService],
  exports: [PolicyDecisionService],
})
export class PolicyModule {}