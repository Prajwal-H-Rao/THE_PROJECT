/** The policy module. */

import { Module } from "@nestjs/common";
import { PolicyDecisionService } from "./policy-decision.service.js";
import { PolicyController } from "./policy.controller.js";
import { PolicyAdminController } from "./policy-admin.controller.js";
import { ServiceAuthGuard } from "./service-auth.guard.js";

@Module({
  controllers: [PolicyController, PolicyAdminController],
  providers: [PolicyDecisionService, ServiceAuthGuard],
  exports: [PolicyDecisionService, ServiceAuthGuard],
})
export class PolicyModule {}