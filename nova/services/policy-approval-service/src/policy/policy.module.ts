/** The policy module. */

import { Module } from "@nestjs/common";
import { PolicyDecisionService } from "./policy-decision.service.js";
import { PolicyController } from "./policy.controller.js";

@Module({
  controllers: [PolicyController],
  providers: [PolicyDecisionService],
  exports: [PolicyDecisionService],
})
export class PolicyModule {}