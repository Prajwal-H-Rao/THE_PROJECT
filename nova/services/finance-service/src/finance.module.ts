/**
 * Nova design system - Finance service module.
 * Provides finance transaction CRUD operations.
 */

import { Module } from "@nestjs/common";
import { FinanceRepository } from "./finance-repository.js";
import { FinanceService } from "./finance-service.js";

@Module({
  providers: [FinanceRepository, FinanceService],
  exports: [FinanceService, FinanceRepository],
})
export class FinanceModule {}
