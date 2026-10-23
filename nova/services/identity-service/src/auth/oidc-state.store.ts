/** OIDC state store for PKCE and nonce. */

import { Injectable, Inject } from "@nestjs/common";
import { Pool, PoolClient } from "pg";

export interface OidcStateRecord {
  state: string;
  provider: "google" | "github";
  code_verifier: string;
  nonce: string;
  redirect_uri: string;
  created_at: Date;
  expires_at: Date;
  consumed_at: Date | null;
}

@Injectable()
export class OidcStateStore {
  constructor(@Inject("PG_POOL") private readonly pool: Pool) {}

  async create(
    state: string,
    provider: "google" | "github",
    codeVerifier: string,
    nonce: string,
    redirectUri: string,
    client?: PoolClient
  ): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const sql = `
      INSERT INTO identity_service.oidc_states
        (state, provider, code_verifier, nonce, redirect_uri, created_at, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    await (client ?? this.pool).query(sql, [
      state,
      provider,
      codeVerifier,
      nonce,
      redirectUri,
      now,
      expiresAt,
    ]);
  }

  async consume(state: string, client?: PoolClient): Promise<OidcStateRecord | null> {
    const result = await (client ?? this.pool).query(
      `UPDATE identity_service.oidc_states
       SET consumed_at = NOW()
       WHERE state = $1 AND consumed_at IS NULL AND expires_at > NOW()
       RETURNING *`,
      [state]
    );
    return result.rows[0] ?? null;
  }

  async find(state: string, client?: PoolClient): Promise<OidcStateRecord | null> {
    const result = await (client ?? this.pool).query(
      `SELECT * FROM identity_service.oidc_states WHERE state = $1`,
      [state]
    );
    return result.rows[0] ?? null;
  }

  async deleteExpired(client?: PoolClient): Promise<number> {
    const result = await (client ?? this.pool).query(
      `DELETE FROM identity_service.oidc_states WHERE expires_at <= NOW()`
    );
    return result.rowCount ?? 0;
  }
}