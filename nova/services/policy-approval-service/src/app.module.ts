/** The root application module. */

import { Module } from "@nestjs/common";
import { PolicyModule } from "./policy/policy.module.js";
import { HealthModule } from "./health/health.module.js";
import { GrantsModule } from "./approval/grants.module.js";

@Module({
  imports: [PolicyModule, HealthModule, GrantsModule],
})
export class AppModule {}