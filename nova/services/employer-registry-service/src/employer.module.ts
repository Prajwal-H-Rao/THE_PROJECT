/**
 * Nova design system - Employer Registry module.
 * Feature module for employer registry + alias providers.
 * Note: app.module.ts is the live root module; this file is not yet
 * imported there (pre-existing). Registration lands with task 21.
 */

import { Module } from "@nestjs/common";
import { EmployerRegistryRepository } from "./employer.repository.js";
import { EmployerRegistryService } from "./employer.service.js";
import { EmployerAliasRepository } from "./alias.repository.js";
import { EmployerAliasService } from "./alias.service.js";

@Module({
  providers: [
    EmployerRegistryRepository,
    EmployerRegistryService,
    EmployerAliasRepository,
    EmployerAliasService,
  ],
  exports: [
    EmployerRegistryService,
    EmployerRegistryRepository,
    EmployerAliasService,
    EmployerAliasRepository,
  ],
})
export class EmployerRegistryServiceModule {}
