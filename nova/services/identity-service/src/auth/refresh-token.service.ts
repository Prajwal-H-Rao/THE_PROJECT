/** Refresh token service with envelope encryption. */

import { Injectable, Inject } from "@nestjs/common";
import { Pool, PoolClient } from "pg";
import { ConfigService } from "@nestjs/config";
import { createHmac, randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

@Injectable()
export class RefreshTokenService {
  constructor(
    @Inject("PG_POOL") private readonly pool: Pool,
    private readonly config: ConfigService
  ) {}

  /** Derive a data encryption key (DEK) from the master key. */
  private deriveDek(masterKey: string): Buffer {
    return createHmac("sha256", masterKey).update("refresh-token-dek").digest().subarray(0, 32);
  }

  /** Encrypt a refresh token using envelope encryption. */
  async encryptRefreshToken(refreshToken: string, client?: PoolClient): Promise<{ encryptedToken: string; keyId: string }> {
    const masterKey = this.config.get("NOVA_REFRESH_TOKEN_MASTER_KEY") ?? "";
    if (!masterKey) {
      throw new Error("Refresh token master key not configured");
    }

    const dek = this.deriveDek(masterKey);
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", dek, iv);
    
    const tokenBytes = Buffer.from(refreshToken, "utf8");
    const ciphertext = Buffer.concat([cipher.update(tokenBytes), cipher.final()]);
    const authTag = cipher.getAuthTag();
    
    // Store: iv + ciphertext + authTag
    const encrypted = Buffer.concat([iv, ciphertext, authTag]);
    
    // Store the key version for rotation support
    const keyId = "v1"; // In production, this would come from a key version table
    
    return {
      encryptedToken: encrypted.toString("base64"),
      keyId: "v1"
    };
  }

  /** Decrypt a refresh token. */
  async decryptRefreshToken(encryptedToken: string, keyId: string, client?: PoolClient): Promise<string | null> {
    const masterKey = this.config.get("NOVA_REFRESH_TOKEN_MASTER_KEY") ?? "";
    if (!masterKey) {
      throw new Error("Refresh token master key not configured");
    }

    try {
      const encrypted = Buffer.from(encryptedToken, "base64");
      const iv = encrypted.subarray(0, 12);
      const authTag = encrypted.subarray(-16);
      const ciphertext = encrypted.subarray(12, -16);
      
      const dek = this.deriveDek(this.config.get("NOVA_REFRESH_TOKEN_MASTER_KEY") ?? "");
      const decipher = createDecipheriv("aes-256-gcm", this.deriveDek(this.config.get("NOVA_REFRESH_TOKEN_MASTER_KEY") ?? ""), iv);
      decipher.setAuthTag(authTag);
      
      const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return plaintext.toString("utf8");
    } catch {
      return null;
    }
  }

  /** Store a refresh token. */
  async storeRefreshToken(
    userId: string,
    provider: string,
    refreshToken: string,
    scope: string,
    expiresAt: Date | null,
    client?: PoolClient
  ): Promise<string> {
    const { encryptedToken, keyId } = await this.encryptRefreshToken(refreshToken);
    
    const result = await (client ?? this.pool).query(
      `INSERT INTO identity_service.refresh_tokens (user_id, provider, encrypted_token, key_id, scope, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING token_id`,
      [userId, provider, encryptedToken, "v1", scope, expiresAt]
    );
    
    return result.rows[0].token_id;
  }

  /** Retrieve and decrypt a refresh token. */
  async getRefreshToken(tokenId: string, client?: PoolClient): Promise<string | null> {
    const result = await (client ?? this.pool).query(
      `SELECT encrypted_token, key_id FROM identity_service.refresh_tokens
       WHERE token_id = $1 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())`,
      [tokenId]
    );
    
    if (result.rows.length === 0) return null;
    
    return this.decryptRefreshToken(result.rows[0].encrypted_token, result.rows[0].key_id);
  }

  /** Revoke a refresh token. */
  async revokeRefreshToken(tokenId: string, client?: PoolClient): Promise<boolean> {
    const result = await (client ?? this.pool).query(
      `UPDATE identity_service.refresh_tokens SET revoked_at = NOW() WHERE token_id = $1 AND revoked_at IS NULL`,
      [tokenId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /** Revoke all refresh tokens for a user. */
  async revokeAllForUser(userId: string, client?: PoolClient): Promise<number> {
    const result = await (client ?? this.pool).query(
      `UPDATE identity_service.refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );
    return result.rowCount ?? 0;
  }
}