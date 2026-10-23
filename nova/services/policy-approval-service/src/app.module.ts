/** The root application module. */

import { Module } from "@nestjs/common";
import { PolicyModule } from "./policy/policy.module.js";
import { HealthModule } from "./health/health.module.js";

@Module({
  imports: [PolicyModule, HealthModule],
})
export class AppModule {}