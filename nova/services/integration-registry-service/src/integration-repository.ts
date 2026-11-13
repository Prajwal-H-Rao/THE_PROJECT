/**
 * Integration repository (task 20.11).
 * Persists integration-registry data: integrations with connector ID,
 * granted scopes, connection status, last sync, and revoke state.
 */

export interface IntegrationRecord {
  readonly integrationId: string;
  readonly provider: string;
  readonly name: string;
  readonly status: string;
  readonly grantedScopes: readonly string[];
  readonly lastSync: string | null;
}

export class IntegrationRepository {
  private readonly integrations = new Map<string, IntegrationRecord>();

  async findAll(): Promise<IntegrationRecord[]> {
    return [...this.integrations.values()];
  }

  async findById(integrationId: string): Promise<IntegrationRecord | undefined> {
    return this.integrations.get(integrationId);
  }

  async create(record: IntegrationRecord): Promise<void> {
    this.integrations.set(record.integrationId, record);
  }

  async update(integrationId: string, updates: Partial<IntegrationRecord>): Promise<void> {
    const existing = this.integrations.get(integrationId);
    if (existing) {
      this.integrations.set(integrationId, { ...existing, ...updates });
    }
  }

  async delete(integrationId: string): Promise<void> {
    this.integrations.delete(integrationId);
  }
}
