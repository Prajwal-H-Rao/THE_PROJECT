/** The grants Nest module. Wires the repository, the service and the
 *  controller. Consumed by domain services through the same verify path.
 *  Imports PolicyModule for the PolicyDecisionService (Task 9 edit re-route). */

import { Module } from "@nestjs/common";
import { GrantsController } from "./grants.controller.js";
import { GrantsService } from "./grants.service.js";
import { InMemoryGrantRepository } from "./grant-repository.js";
import { PolicyModule } from "../policy/policy.module.js";

@Module({
  imports: [PolicyModule],
  controllers: [GrantsController],
  providers: [GrantsService, InMemoryGrantRepository],
  exports: [GrantsService],
})
export class GrantsModule {}