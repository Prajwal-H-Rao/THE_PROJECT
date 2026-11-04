/**
 * Nova design system - Remembered fact service.
 * Per-item source, edit, deletion and forget actions with ownership enforcement.
 * Cross-user read denied: every operation filters by user_id.
 */

import { Injectable } from "@nestjs/common";
import { FactRepository } from "./fact.repository.js";
import type { RememberedFact, CreateFactInput, UpdateFactInput, FactListFilter } from "./fact.entity.js";

export class FactNotFoundError extends Error {
  constructor(public readonly factId: string) {
    super(`Remembered fact not found: ${factId}`);
    this.name = "FactNotFoundError";
  }
}

export class FactForbiddenError extends Error {
  constructor(public readonly factId: string) {
    super(`Access denied to remembered fact: ${factId}`);
    this.name = "FactForbiddenError";
  }
}

@Injectable()
export class FactService {
  constructor(private readonly repository: FactRepository) {}

  /** Create one remembered fact for one user. Returns the created fact. */
  async createFact(userId: string, input: CreateFactInput): Promise<RememberedFact> {
    return this.repository.create(userId, input);
  }

  /** Read one remembered fact by ID only if the user owns it.
   * Throws FactNotFoundError if not found or not owned. */
  async sourceFact(userId: string, factId: string): Promise<RememberedFact> {
    const fact = await this.repository.getFact(userId, factId);
    if (!fact) {
      throw new FactNotFoundError(factId);
    }
    return fact;
  }

  /** List remembered facts for one user with optional source/archive filter. */
  async listFacts(userId: string, filter?: FactListFilter): Promise<RememberedFact[]> {
    return this.repository.listFacts(userId, filter);
  }

  /** Update one remembered fact only if the user owns it.
   * Throws FactNotFoundError if not found or not owned. */
  async editFact(
    userId: string,
    factId: string,
    input: UpdateFactInput,
  ): Promise<RememberedFact> {
    const fact = await this.repository.updateFact(userId, factId, input);
    if (!fact) {
      throw new FactNotFoundError(factId);
    }
    return fact;
  }

  /** Archive (soft-delete) one remembered fact only if the user owns it.
   * The fact remains but is excluded from active listings. */
  async archiveFact(userId: string, factId: string): Promise<void> {
    const archived = await this.repository.archiveFact(userId, factId);
    if (!archived) {
      throw new FactNotFoundError(factId);
    }
  }

  /** Forget one remembered fact only if the user owns it.
   * Hard-deletes the row and its inline vector entirely.
   * Throws FactNotFoundError if not found or not owned. */
  async forgetFact(userId: string, factId: string): Promise<void> {
    const deleted = await this.repository.forgetFact(userId, factId);
    if (!deleted) {
      throw new FactNotFoundError(factId);
    }
  }
}
