/** The grants Nest module. Wires the repository, the service and the
 * controller. Consumed by domain services through the same verify path. */

import { Module } from "@nestjs/common";
import { GrantsController } from "./grants.controller.js";
import { GrantsService, InMemoryGrantRepository } from "./grants.service.js";

@Module({
  controllers: [GrantsController],
  providers: [GrantsService, InMemoryGrantRepository],
  exports: [GrantsService],
})
export class GrantsModule {}
