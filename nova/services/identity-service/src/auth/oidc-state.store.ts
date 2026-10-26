/** OIDC state store for PKCE and nonce. */

import { Injectable, Inject } from "@nestjs/common";
import { Pool, PoolClient } from "pg";
import { createHash } from "node:crypto";

export interface OidcStateRecord {
  state: string;
  provider: "google" | "github";
  code_verifier_hash: string;
  nonce: string;
  redirect_uri: string;
  created_at: Date;
  expires_at: Date;
  consumed_at: Date | null;
}

function hashCodeVerifier(codeVerifier: string): string {
  return createHash("sha256").update(codeVerifier).digest("hex");
}

function verifyCodeVerifier(codeVerifier: string, storedHash: string): boolean {
  return hashCodeVerifier(codeVerifier) === storedHash;
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
        (state, provider, code_verifier_hash, nonce, redirect_uri, created_at, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    await (client ?? this.pool).query(sql, [
      state,
      provider,
      hashCodeVerifier(codeVerifier),
      nonce,
      redirectUri,
      now,
      expiresAt,
    ]);
  }

  async consume(
    state: string,
    codeVerifier: string,
    client?: PoolClient
  ): Promise<OidcStateRecord | null> {
    const result = await (client ?? this.pool).query(
      `UPDATE identity_service.oidc_states
       SET consumed_at = NOW()
       WHERE state = $1 AND consumed_at IS NULL AND expires_at > NOW() AND code_verifier_hash = $2
       RETURNING *`,
      [state, hashCodeVerifier(codeVerifier)]
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

  async verifyCodeVerifier(state: string, codeVerifier: string, client?: PoolClient): Promise<boolean> {
    const record = await this.find(state, client);
    if (!record) return false;
    return verifyCodeVerifier(codeVerifier, record.code_verifier_hash);
  }

  async deleteExpired(client?: PoolClient): Promise<number> {
    const result = await (client ?? this.pool).query(
      `DELETE FROM identity_service.oidc_states WHERE expires_at <= NOW()`
    );
    return result.rowCount ?? 0;
  }
}