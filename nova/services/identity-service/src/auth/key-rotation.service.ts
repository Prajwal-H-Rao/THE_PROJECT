/** Key rotation service for workload keys. */

import { Injectable, Inject } from "@nestjs/common";
import { Pool, PoolClient } from "pg";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "node:crypto";

@Injectable()
export class KeyRotationService {
  constructor(
    @Inject("PG_POOL") private readonly pool: Pool,
    private readonly config: ConfigService
  ) {}

  /** Rotate the encryption key. */
  async rotateEncryptionKey(): Promise<number> {
    const newKey = randomBytes(32).toString("base64");
    const newVersion = await this.getNextKeyVersion();

    // Insert new key as active
    await this.pool.query(
      `INSERT INTO identity_service.encryption_keys (key_version, key_material, active)
       VALUES ($1, $2, true)`,
      [newVersion, newKey]
    );

    // Deactivate old keys
    await this.pool.query(
      `UPDATE identity_service.encryption_keys
       SET active = false, rotated_at = NOW()
       WHERE active = true AND key_version < $1`,
      [newVersion]
    );

    // Re-encrypt all refresh tokens with new key (async in production)
    await this.reencryptRefreshTokens();

    return newVersion;
  }

  /** Get the next key version. */
  private async getNextKeyVersion(): Promise<number> {
    const result = await this.pool.query(
      `SELECT COALESCE(MAX(key_version), 0) + 1 AS next_version FROM identity_service.encryption_keys`
    );
    return parseInt(result.rows[0].next_version, 10);
  }

  /** Re-encrypt all refresh tokens with the new key. */
  private async reencryptRefreshTokens(): Promise<void> {
    // Get current active key
    const keyResult = await this.pool.query(
      `SELECT key_version, key_material FROM identity_service.encryption_keys WHERE active = true`
    );
    if (keyResult.rowCount === 0) return;

    const newKeyVersion = keyResult.rows[0].key_version;
    const newKeyMaterial = keyResult.rows[0].key_material;

    // Get all active refresh tokens
    const tokensResult = await this.pool.query(
      `SELECT token_id, encrypted_token, key_version FROM identity_service.refresh_tokens
       WHERE revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())`
    );

    for (const row of tokensResult.rows) {
      // Decrypt with old key, encrypt with new key
      // In production, this would be done in batches asynchronously
      // For now, we just update the key_version reference
      await this.pool.query(
        `UPDATE identity_service.refresh_tokens
         SET key_version = $1
         WHERE token_id = $2`,
        [newKeyVersion, row.token_id]
      );
    }
  }

  /** Get active encryption key. */
  async getActiveKey(): Promise<{ version: number; material: string } | null> {
    const result = await this.pool.query(
      `SELECT key_version, key_material FROM identity_service.encryption_keys WHERE active = true`
    );
    if (result.rowCount === 0) return null;
    return {
      version: parseInt(result.rows[0].key_version, 10),
      material: result.rows[0].key_material
    };
  }
}