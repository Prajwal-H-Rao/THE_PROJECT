/**
 * Root application module for the integration-registry service.
 * Wires the integration repository and service.
 */

import { Module } from "@nestjs/common";
import { IntegrationRepository } from "./integration-repository.js";
import { IntegrationService } from "./integration-service.js";
import { IntegrationController } from "./integration-controller.js";

@Module({
  providers: [
    IntegrationRepository,
    IntegrationService,
    IntegrationController,
  ],
  exports: [IntegrationService],
})
export class AppModule {}
