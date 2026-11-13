/**
 * Integration service (task 20.11).
 * Provides integration registry operations: register, list, update,
 * revoke integration sources.
 */

import { Injectable } from "@nestjs/common";
import { IntegrationRepository, IntegrationRecord } from "./integration-repository.js";

@Injectable()
export class IntegrationService {
  constructor(private readonly repository: IntegrationRepository) {}

  async createIntegration(record: {
    integrationId: string;
    provider: string;
    name: string;
    status: string;
    grantedScopes: readonly string[];
    lastSync: string | null;
  }): Promise<void> {
    await this.repository.create(record);
  }

  async listIntegrations(): Promise<IntegrationRecord[]> {
    return this.repository.findAll();
  }

  async getIntegration(integrationId: string): Promise<IntegrationRecord | undefined> {
    return this.repository.findById(integrationId);
  }

  async updateIntegration(integrationId: string, updates: {
    status?: string;
    grantedScopes?: readonly string[];
    lastSync?: string | null;
  }): Promise<void> {
    await this.repository.update(integrationId, updates);
  }

  async revokeIntegration(integrationId: string): Promise<void> {
    await this.repository.delete(integrationId);
  }
}
