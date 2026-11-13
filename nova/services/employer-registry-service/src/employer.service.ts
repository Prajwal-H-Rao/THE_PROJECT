/**
 * Nova design system - Employer Registry service.
 * Provides employer CRUD operations.
 */

import { Injectable } from "@nestjs/common";
import { EmployerRegistryRepository } from "./employer.repository.js";
import { CircuitBreaker } from "./circuit-breaker.js";

/** Input fields for creating one employer record. */
interface EmployerInput {
  readonly name: string;
  readonly status?: string;
  readonly type?: string;
  readonly region?: string | null;
  readonly contact_info?: Record<string, unknown>;
}

@Injectable()
export class EmployerRegistryService {
  private readonly breaker = new CircuitBreaker("employer-registry", 5, 30000, 3);

  constructor(private readonly repository: EmployerRegistryRepository) {}

  async createEmployer(input: EmployerInput) {
    if (!this.breaker.canExecute()) {
      throw new Error("circuit breaker open: employer registry temporarily unavailable");
    }
    try {
      const result = await this.repository.createEmployer({
        name: input.name,
        status: input.status ?? "active",
        type: input.type ?? "GLOBAL",
        region: input.region ?? null,
        contact_info: input.contact_info ?? {},
      });
      this.breaker.recordSuccess();
      return result;
    } catch (err) {
      this.breaker.recordFailure();
      throw err;
    }
  }

  async listEmployers() {
    if (!this.breaker.canExecute()) {
      throw new Error("circuit breaker open: employer registry temporarily unavailable");
    }
    try {
      const result = await this.repository.listEmployers();
      this.breaker.recordSuccess();
      return result;
    } catch (err) {
      this.breaker.recordFailure();
      throw err;
    }
  }
}
