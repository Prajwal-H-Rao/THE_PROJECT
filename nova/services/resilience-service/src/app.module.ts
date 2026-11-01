/**
 * Root application module for resilience-service.
 */

import { Module } from "@nestjs/common";
import { ResilienceModule } from "./resilience.module.js";

@Module({
  imports: [ResilienceModule],
})
export class AppModule {}
