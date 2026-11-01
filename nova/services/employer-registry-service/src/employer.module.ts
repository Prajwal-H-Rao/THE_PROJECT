/**
 * Nova design system - Employer Registry module.
 */

import { Module } from "@nestjs/common";
import { EmployerRegistryRepository } from "./employer.repository.js";
import { EmployerRegistryService } from "./employer.service.js";

@Module({
  providers: [EmployerRegistryRepository, EmployerRegistryService],
  exports: [EmployerRegistryService, EmployerRegistryRepository],
})
export class EmployerRegistryServiceModule {}
