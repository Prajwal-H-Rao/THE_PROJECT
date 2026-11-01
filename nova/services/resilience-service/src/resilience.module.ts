/**
 * Nova design system - Resilience module.
 */

import { Module } from "@nestjs/common";
import { ResilienceService } from "./resilience.service.js";

@Module({
  providers: [ResilienceService],
  exports: [ResilienceService],
})
export class ResilienceModule {}
