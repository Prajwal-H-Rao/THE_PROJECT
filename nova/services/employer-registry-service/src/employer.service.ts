/**
 * Nova design system - Employer Registry service.
 * Provides employer CRUD operations.
 */

import { Injectable } from "@nestjs/common";
import { EmployerRegistryRepository } from "./employer.repository.js";

@Injectable()
export class EmployerRegistryService {
  constructor(private readonly repository: EmployerRegistryRepository) {}

  async createEmployer(input: any) {
    return this.repository.createEmployer(input);
  }

  async listEmployers() {
    return this.repository.listEmployers();
  }
}
