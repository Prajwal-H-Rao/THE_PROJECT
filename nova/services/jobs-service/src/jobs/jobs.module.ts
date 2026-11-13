/**
 * Nova design system - Jobs module.
 * Wires JobsService.
 */

import { Module } from "@nestjs/common";
import { JobsService } from "./job.service.js";

@Module({
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
