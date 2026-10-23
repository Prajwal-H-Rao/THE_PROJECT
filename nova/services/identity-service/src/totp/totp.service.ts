/** TOTP service for two-factor authentication. */

import { Injectable, Inject } from "@nestjs/common";
import { Pool, PoolClient } from "pg";
import { authenticator } from "otplib";
import { createHmac, randomBytes } from "node:crypto";

@Injectable()
export class TotpService {
  constructor(@Inject("PG_POOL") private readonly pool: Pool) {}

  /** Generate a new TOTP secret for a user. */
  generateSecret(): string {
    return authenticator.generateSecret();
  }

  /** Generate a TOTP URI for QR code. */
  getTotpUri(secret: string, email: string, issuer: string = "NOVA"): string {
    return authenticator.keyuri(email, issuer, secret);
  }

  /** Verify a TOTP token. */
  verifyToken(token: string, secret: string): boolean {
    return authenticator.check(token, secret);
  }

  /** Generate backup codes for a user. */
  generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(randomBytes(4).toString("hex").toUpperCase());
    }
    return codes;
  }

  /** Hash a backup code for storage. */
  hashBackupCode(code: string): string {
    return createHmac("sha256", "nova-backup-code-salt").update(code).digest("hex");
  }

  /** Verify a backup code against stored hashes. */
  verifyBackupCode(code: string, storedHashes: string[]): { valid: boolean; index: number } {
    const hashed = this.hashBackupCode(code);
    const index = storedHashes.indexOf(hashed);
    return { valid: index >= 0, index };
  }

  /** Store TOTP secret and backup codes for a user. */
  async enableTotp(
    userId: string,
    secret: string,
    backupCodes: string[],
    client?: PoolClient
  ): Promise<void> {
    const hashedCodes = backupCodes.map((c) => this.hashBackupCode(c));
    await (client ?? this.pool).query(
      `INSERT INTO identity_service.totp_secrets (user_id, secret, backup_codes, enabled_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id) DO UPDATE SET secret = $2, backup_codes = $3, enabled_at = NOW()`,
      [userId, secret, JSON.stringify(hashedCodes)]
    );
  }

  /** Disable TOTP for a user. */
  async disableTotp(userId: string, client?: PoolClient): Promise<void> {
    await (client ?? this.pool).query(
      `DELETE FROM identity_service.totp_secrets WHERE user_id = $1`,
      [userId]
    );
  }

  /** Get TOTP secret for a user. */
  async getTotpSecret(userId: string, client?: PoolClient): Promise<{ secret: string; backup_codes: string[] } | null> {
    const result = await (client ?? this.pool).query(
      `SELECT secret, backup_codes FROM identity_service.totp_secrets WHERE user_id = $1`,
      [userId]
    );
    if (result.rows.length === 0) return null;
    return {
      secret: result.rows[0].secret,
      backup_codes: result.rows[0].backup_codes,
    };
  }

  /** Verify TOTP or backup code for login. */
  async verifyLogin(
    userId: string,
    token: string,
    client?: PoolClient
  ): Promise<{ valid: boolean; usedBackupCode: boolean }> {
    const result = await (client ?? this.pool).query(
      `SELECT secret, backup_codes FROM identity_service.totp_secrets WHERE user_id = $1`,
      [userId]
    );
    if (result.rows.length === 0) {
      return { valid: false, usedBackupCode: false };
    }

    const { secret, backup_codes } = result.rows[0];

    // Try TOTP first
    if (authenticator.check(token, secret)) {
      return { valid: true, usedBackupCode: false };
    }

    // Try backup codes
    const backupHashes = backup_codes as string[];
    const { valid, index } = this.verifyBackupCode(token, backupHashes);
    if (valid) {
      // Remove used backup code
      const newCodes = backupHashes.filter((_, i) => i !== index);
      await (client ?? this.pool).query(
        `UPDATE identity_service.totp_secrets SET backup_codes = $1 WHERE user_id = $2`,
        [JSON.stringify(newCodes), userId]
      );
      return { valid: true, usedBackupCode: true };
    }

    return { valid: false, usedBackupCode: false };
  }
}