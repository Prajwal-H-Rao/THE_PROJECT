/** RBAC service for role-based access control. */

import { Injectable, Inject } from "@nestjs/common";
import { Pool, PoolClient } from "pg";

export type RoleType = "admin" | "user" | "viewer";

@Injectable()
export class RbacService {
  constructor(@Inject("PG_POOL") private readonly pool: Pool) {}

  /** Grant a role to a user. */
  async grantRole(
    userId: string,
    role: "admin" | "user" | "viewer",
    grantedBy: string
  ): Promise<string> {
    // Layer 9: Prevent self-extension — block self-granting of admin role
    if (role === "admin" && userId === grantedBy) {
      throw new Error("Cannot self-grant admin role (self-extension prohibited)");
    }

    // Layer 9: Prevent self-extension — block any self-granting of roles
    if (userId === grantedBy) {
      throw new Error("Cannot self-grant any role (self-extension prohibited)");
    }

    // Only admins can grant admin role
    if (role === "admin") {
      const isAdmin = await this.userHasRole(grantedBy, "admin");
      if (!isAdmin) {
        throw new Error("Only admins can grant admin role");
      }
    }

    const result = await this.pool.query(
      `INSERT INTO identity_service.user_roles (user_id, role, granted_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, role) DO UPDATE SET
         revoked_at = NULL,
         granted_at = NOW(),
         granted_by = EXCLUDED.granted_by
       RETURNING role_id`,
      [userId, role, grantedBy]
    );
    return result.rows[0].role_id;
  }

  /** Revoke a role from a user. */
  async revokeRole(userId: string, role: "admin" | "user" | "viewer", revokedBy: string): Promise<boolean> {
    // Layer 9: Prevent self-extension — block self-revocation of admin role
    if (role === "admin" && userId === revokedBy) {
      throw new Error("Cannot self-revoke admin role (self-extension prohibited)");
    }
    
    const result = await this.pool.query(
      `UPDATE identity_service.user_roles
       SET revoked_at = NOW()
       WHERE user_id = $1 AND role = $2 AND revoked_at IS NULL`,
      [userId, role]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /** Check if user has a specific role. */
  async userHasRole(userId: string, role: "admin" | "user" | "viewer"): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT 1 FROM identity_service.user_roles
       WHERE user_id = $1 AND role = $2 AND revoked_at IS NULL`,
      [userId, role]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /** Get all active roles for a user. */
  async getUserRoles(userId: string): Promise<Array<{ role: string; grantedAt: Date }>> {
    const result = await this.pool.query(
      `SELECT role, granted_at FROM identity_service.user_roles
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );
    return result.rows;
  }

  /** Check if user is admin. */
  async isAdmin(userId: string): Promise<boolean> {
    return this.userHasRole(userId, "admin");
  }

  /** Check if user is viewer. */
  async isViewer(userId: string): Promise<boolean> {
    return this.userHasRole(userId, "viewer");
  }

  /** Check if user has any admin-level role. */
  async hasAdminAccess(userId: string): Promise<boolean> {
    return this.userHasRole(userId, "admin");
  }
}