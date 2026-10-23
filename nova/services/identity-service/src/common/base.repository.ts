/** Base repository with resource ownership checks. */

import { Injectable, Inject } from "@nestjs/common";
import { Pool, PoolClient } from "pg";

export interface OwnershipCheckResult {
  readonly allowed: boolean;
  readonly reason?: string;
}

@Injectable()
export class BaseRepository {
  constructor(@Inject("PG_POOL") protected readonly pool: Pool) {}

  /**
   * Check if a user owns a resource in a given table.
   * @param userId The user ID to check ownership for
   * @param tableName The table name (without schema prefix)
   * @param resourceId The resource ID to check
   * @param ownerColumn The column name that stores the owner's user ID (default: "user_id")
   * @param client Optional pool client for transaction support
   */
  async checkOwnership(
    userId: string,
    tableName: string,
    resourceId: string,
    ownerColumn: string = "user_id",
    client?: PoolClient
  ): Promise<boolean> {
    const executor = client ?? this.pool;
    const query = `
      SELECT 1 FROM identity_service.${tableName}
      WHERE id = $1 AND ${ownerColumn} = $2
    `;
    const result = await executor.query(query, [resourceId, userId]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Enforce resource ownership - throws if user doesn't own the resource.
   * @throws Error with code "FORBIDDEN" if user doesn't own the resource
   */
  async enforceOwnership(
    userId: string,
    tableName: string,
    resourceId: string,
    ownerColumn: string = "user_id",
    client?: PoolClient
  ): Promise<void> {
    const hasAccess = await this.checkOwnership(userId, tableName, resourceId, ownerColumn, client);
    if (!hasAccess) {
      throw new Error("FORBIDDEN: User does not own this resource");
    }
  }

  /**
   * Get a resource by ID only if the user owns it.
   * @returns The resource row if owned by user, null otherwise
   */
  async findOwned<T>(
    userId: string,
    tableName: string,
    resourceId: string,
    ownerColumn: string = "user_id",
    idColumn: string = "id",
    client?: PoolClient
  ): Promise<T | null> {
    const executor = client ?? this.pool;
    const query = `
      SELECT * FROM identity_service.${tableName}
      WHERE ${idColumn} = $1 AND ${ownerColumn} = $2
    `;
    const result = await executor.query(query, [resourceId, userId]);
    return (result.rows[0] as T) ?? null;
  }
}