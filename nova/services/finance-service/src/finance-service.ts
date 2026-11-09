/**
 * Nova design system - Finance service.
 * CRUD operations for finance transactions with ownership enforcement.
 * All operations filter by user_id to ensure data isolation.
 */

import { Injectable } from "@nestjs/common";
import { FinanceTransactionRepository } from "./finance-repository.js";
import type { FinanceTransaction, CreateFinanceTransactionInput, FinanceTransactionListFilter } from "./finance-entity.js";

@Injectable()
export class FinanceService {
  constructor(private readonly repository: FinanceTransactionRepository) {}

  async createTransaction(userId: string, input: CreateFinanceTransactionInput): Promise<FinanceTransaction> {
    // Content-addressed deduplication: if an identical transaction (same
    // idempotency key) already exists, return it instead of inserting a
    // duplicate. Re-importing the same statement is a no-op.
    const existing = await this.repository.findByIdempotencyKey(userId, input.idempotencyKey);
    if (existing) {
      return existing;
    }

    const result = await this.repository.create(userId, input);
    if (!result) {
      throw new Error(`Failed to create transaction for user ${userId}`);
    }
    return result;
  }

  async getTransaction(userId: string, transactionId: string): Promise<FinanceTransaction | null> {
    return this.repository.findById(userId, transactionId);
  }

  async listTransactions(userId: string, filter?: FinanceTransactionListFilter): Promise<FinanceTransaction[]> {
    return this.repository.list(userId, filter);
  }

  async deleteTransaction(userId: string, transactionId: string): Promise<boolean> {
    return this.repository.deleteTransaction(userId, transactionId);
  }
}
