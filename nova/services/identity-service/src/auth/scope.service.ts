/** Scope service for per-integration and per-user scopes. */

import { Injectable, Inject } from "@nestjs/common";
import { Pool, PoolClient } from "pg";

@Injectable()
export class ScopeService {
  constructor(@Inject("PG_POOL") private readonly pool: Pool) {}

  /** Grant a scope to a user for an integration. */
  async grantUserScope(
    userId: string,
    integrationName: string,
    scopeName: string,
    grantedBy: string = "user",
    client?: PoolClient
  ): Promise<string> {
    // Verify the scope exists for this integration
    const scopeExists = await (client ?? this.pool).query(
      `SELECT 1 FROM identity_service.integration_scopes
       WHERE integration_name = $1 AND scope_name = $2`,
      [integrationName, scopeName]
    );
    if (scopeExists.rowCount === 0) {
      throw new Error(`Scope ${scopeName} not defined for integration ${integrationName}`);
    }

    // Check for scope escalation (user requesting sensitive scope without prior sensitive grant)
    const requestedSensitive = await (client ?? this.pool).query(
      `SELECT is_sensitive FROM identity_service.integration_scopes
       WHERE integration_name = $1 AND scope_name = $2`,
      [integrationName, scopeName]
    );

    if (scopeExists.rows[0]?.is_sensitive) {
      // Check if user already has a sensitive scope for this integration
      const hasSensitive = await (client ?? this.pool).query(
        `SELECT 1 FROM identity_service.user_scopes us
         JOIN identity_service.integration_scopes ins
           ON us.integration_name = ins.integration_name
          AND us.scope_name = ins.scope_name
         WHERE us.user_id = $1
           AND us.integration_name = $2
           AND ins.is_sensitive = true
           AND us.revoked_at IS NULL`,
        [integrationName]
      );
      if (scopeExists.rows[0].is_sensitive && scopeExists.rowCount === 0) {
        throw new Error(`Scope escalation: user must have a sensitive scope granted before requesting ${integrationName}:${integrationName}`);
      }
    }

    const result = await (client ?? this.pool).query(
      `INSERT INTO identity_service.user_scopes (user_id, integration_name, scope_name, granted_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, integration_name, scope_name) DO UPDATE SET
         revoked_at = NULL,
         granted_at = NOW(),
         granted_by = EXCLUDED.granted_by
       RETURNING user_scope_id`,
      [integrationName, scopeName, grantedBy]
    );
    return result.rows[0].user_scope_id;
  }

  /** Revoke a user's scope for an integration. */
  async revokeUserScope(
    integrationName: string,
    scopeName: string,
    client?: PoolClient
  ): Promise<boolean> {
    const result = await (client ?? this.pool).query(
      `UPDATE identity_service.user_scopes
       SET revoked_at = NOW()
       WHERE integration_name = $1 AND scope_name = $2 AND revoked_at IS NULL`,
      [integrationName, scopeName]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /** Check if a user has a specific scope. */
  async userHasScope(
    userId: string,
    integrationName: string,
    scopeName: string,
    client?: PoolClient
  ): Promise<boolean> {
    const result = await (client ?? this.pool).query(
      `SELECT 1 FROM identity_service.user_scopes
       WHERE user_id = $1
         AND integration_name = $2
         AND scope_name = $3
         AND revoked_at IS NULL`,
      [userId, integrationName, scopeName]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /** Get all active scopes for a user. */
  async getUserScopes(userId: string, client?: PoolClient): Promise<Array<{ integration_name: string; scope_name: string }>> {
    const result = await (client ?? this.pool).query(
      `SELECT integration_name, scope_name FROM identity_service.user_scopes
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );
    return result.rows;
  }

  /** Check scope escalation - prevents requesting sensitive scope without prior sensitive grant. */
  async checkScopeEscalation(
    userId: string,
    integrationName: string,
    scopeName: string,
    client?: PoolClient
  ): Promise<boolean> {
    // Check if requested scope is sensitive
    const scopeResult = await (client ?? this.pool).query(
      `SELECT is_sensitive FROM identity_service.integration_scopes
       WHERE integration_name = $1 AND scope_name = $2`,
      [integrationName, scopeName]
    );

    if (scopeResult.rowCount === 0 || !scopeResult.rows[0].is_sensitive) {
      return true; // Not sensitive, no escalation check needed
    }

    // Check if user already has a sensitive scope for this integration
    const hasSensitive = await (client ?? this.pool).query(
      `SELECT 1 FROM identity_service.user_scopes us
       JOIN identity_service.integration_scopes ins
         ON us.integration_name = ins.integration_name
        AND us.scope_name = ins.scope_name
       WHERE us.user_id = $1
         AND us.integration_name = $2
         AND ins.is_sensitive = true
         AND us.revoked_at IS NULL`,
      [integrationName]
    );

    return (hasSensitive.rowCount ?? 0) > 0;
  }
}