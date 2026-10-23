/** User repository for database operations. */

import { Injectable, Inject } from "@nestjs/common";
import { Pool, PoolClient } from "pg";

export interface UserRecord {
  user_id: string;
  email: string;
  email_verified: boolean;
  display_name: string | null;
  avatar_url: string | null;
  locale: string;
  timezone: string;
  password_hash: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ChannelIdentityRecord {
  identity_id: string;
  user_id: string;
  provider: string;
  provider_user_id: string;
  provider_data: Record<string, unknown>;
  linked_at: Date;
  unlinked_at: Date | null;
}

export interface CreateUserInput {
  email: string;
  email_verified: boolean;
  display_name?: string;
  avatar_url?: string;
  locale?: string;
  timezone?: string;
}

export interface LinkChannelIdentityInput {
  user_id: string;
  provider: string;
  provider_user_id: string;
  provider_data: Record<string, unknown>;
}

@Injectable()
export class UserRepository {
  constructor(@Inject("PG_POOL") private readonly pool: Pool) {}

  async findById(userId: string, client?: PoolClient): Promise<UserRecord | null> {
    const result = await (client ?? this.pool).query(
      `SELECT * FROM identity_service.users WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0] ?? null;
  }

  async findByEmail(email: string, client?: PoolClient): Promise<UserRecord | null> {
    const result = await (client ?? this.pool).query(
      `SELECT * FROM identity_service.users WHERE email = $1`,
      [email.toLowerCase()]
    );
    return result.rows[0] ?? null;
  }

  async findChannelIdentity(provider: string, providerUserId: string, client?: PoolClient): Promise<ChannelIdentityRecord | null> {
    const result = await (client ?? this.pool).query(
      `SELECT * FROM identity_service.channel_identities WHERE provider = $1 AND provider_user_id = $2 AND unlinked_at IS NULL`,
      [provider, providerUserId]
    );
    return result.rows[0] ?? null;
  }

  async createUser(input: CreateUserInput, client?: PoolClient): Promise<string> {
    const userId = crypto.randomUUID();
    const now = new Date();
    const locale = input.locale ?? "en";
    const timezone = input.timezone ?? "UTC";

    await (client ?? this.pool).query(
      `INSERT INTO identity_service.users
        (user_id, email, email_verified, display_name, avatar_url, locale, timezone, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
      [userId, input.email.toLowerCase(), input.email_verified, input.display_name ?? null, input.avatar_url ?? null, locale, timezone, now]
    );
    return userId;
  }

  async linkChannelIdentity(input: LinkChannelIdentityInput, client?: PoolClient): Promise<void> {
    const identityId = crypto.randomUUID();
    const now = new Date();
    await (client ?? this.pool).query(
      `INSERT INTO identity_service.channel_identities
        (identity_id, user_id, provider, provider_user_id, provider_data, linked_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [identityId, input.user_id, input.provider, input.provider_user_id, JSON.stringify(input.provider_data), now]
    );
  }

  async unlinkChannelIdentity(userId: string, provider: string, client?: PoolClient): Promise<boolean> {
    const result = await (client ?? this.pool).query(
      `UPDATE identity_service.channel_identities
       SET unlinked_at = NOW()
       WHERE user_id = $1 AND provider = $2 AND unlinked_at IS NULL`,
      [userId, provider]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async updateUser(userId: string, updates: Partial<CreateUserInput>, client?: PoolClient): Promise<UserRecord | null> {
    const fields: string[] = [];
    const params: unknown[] = [userId];
    let idx = 2;

    if (updates.email !== undefined) {
      fields.push(`email = $${idx++}`);
      params.push(updates.email.toLowerCase());
    }
    if (updates.email_verified !== undefined) {
      fields.push(`email_verified = $${idx++}`);
      params.push(updates.email_verified);
    }
    if (updates.display_name !== undefined) {
      fields.push(`display_name = $${idx++}`);
      params.push(updates.display_name);
    }
    if (updates.avatar_url !== undefined) {
      fields.push(`avatar_url = $${idx++}`);
      params.push(updates.avatar_url);
    }
    if (updates.locale !== undefined) {
      fields.push(`locale = $${idx++}`);
      params.push(updates.locale);
    }
    if (updates.timezone !== undefined) {
      fields.push(`timezone = $${idx++}`);
      params.push(updates.timezone);
    }

    if (fields.length === 0) {
      return this.findById(userId, client);
    }

    fields.push(`updated_at = NOW()`);
    const sql = `UPDATE identity_service.users SET ${fields.join(", ")} WHERE user_id = $1 RETURNING *`;
    const result = await (client ?? this.pool).query(sql, params);
    return result.rows[0] ?? null;
  }

  /** Update a user's password hash. */
  async updatePasswordHash(userId: string, passwordHash: string, client?: PoolClient): Promise<void> {
    await (client ?? this.pool).query(
      `UPDATE identity_service.users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2`,
      [passwordHash, userId]
    );
  }

  /** Get a user's password hash. */
  async getPasswordHash(userId: string, client?: PoolClient): Promise<string | null> {
    const result = await (client ?? this.pool).query(
      `SELECT password_hash FROM identity_service.users WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0]?.password_hash ?? null;
  }
}