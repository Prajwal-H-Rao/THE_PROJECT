/**
 * Nova design system - Remembered fact module.
 * Wires FactRepository and FactService.
 */

import { Module } from "@nestjs/common";
import { FactRepository } from "./fact.repository.js";
import { FactService } from "./fact.service.js";
import { FactController } from "./fact.controller.js";

@Module({
  providers: [FactRepository, FactService],
  controllers: [FactController],
  exports: [FactService],
})
export class FactModule {}
