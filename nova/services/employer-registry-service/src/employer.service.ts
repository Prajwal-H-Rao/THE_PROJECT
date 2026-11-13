/**
 * Nova design system - Employer Registry service.
 * Provides employer CRUD operations.
 */

import { Injectable } from "@nestjs/common";
import { EmployerRegistryRepository } from "./employer.repository.js";

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
  constructor(private readonly repository: EmployerRegistryRepository) {}

  async createEmployer(input: EmployerInput) {
    return this.repository.createEmployer({
      name: input.name,
      status: input.status ?? "active",
      type: input.type ?? "GLOBAL",
      region: input.region ?? null,
      contact_info: input.contact_info ?? {},
    });
  }

  async listEmployers() {
    return this.repository.listEmployers();
  }
}
