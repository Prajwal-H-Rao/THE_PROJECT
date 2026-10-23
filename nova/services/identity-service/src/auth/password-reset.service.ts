/** Password reset service with email OTP. */

import { Injectable, Inject } from "@nestjs/common";
import { Pool, PoolClient } from "pg";
import { ConfigService } from "@nestjs/config";
import { SessionService } from "../session/session.service.js";
import { UserRepository } from "../account/user.repository.js";
import { createHash, randomBytes } from "node:crypto";

@Injectable()
export class PasswordResetService {
  constructor(
    @Inject("PG_POOL") private readonly pool: Pool,
    private readonly config: ConfigService,
    private readonly sessionService: SessionService,
    private readonly userRepo: UserRepository
  ) {}

  /** Generate a 6-digit OTP. */
  private generateOtp(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  /** Hash an OTP for storage. */
  private hashOtp(otp: string): string {
    return createHash("sha256").update(otp).digest("hex");
  }

  /** Initiate a password reset by sending an OTP to the user's email. */
  async initiatePasswordReset(email: string, client?: PoolClient): Promise<{ success: boolean }> {
    const user = await this.userRepo.findByEmail(email, client);
    if (!user) {
      // Don't reveal if email exists
      return { success: true };
    }

    const otp = this.generateOtp();
    const otpHash = this.hashOtp(otp);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await (client ?? this.pool).query(
      `INSERT INTO identity_service.password_reset_tokens (user_id, token_hash, email, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET
         token_hash = EXCLUDED.token_hash,
         email = EXCLUDED.email,
         expires_at = EXCLUDED.expires_at,
         consumed_at = NULL`,
      [user.user_id, this.hashOtp(otp), email, expiresAt]
    );

    // TODO: Send OTP via email service
    // For now, log it (in production, use email service)
    console.log(`Password reset OTP for ${email}: ${otp}`);

    return { success: true };
  }

  /** Verify the OTP and return a reset token if valid. */
  async verifyOtp(email: string, otp: string, client?: PoolClient): Promise<{ valid: boolean; resetToken?: string }> {
    const user = await this.userRepo.findByEmail(email, client);
    if (!user) {
      return { valid: false };
    }

    const result = await (client ?? this.pool).query(
      `SELECT token_hash, expires_at FROM identity_service.password_reset_tokens
       WHERE user_id = $1 AND email = $2 AND consumed_at IS NULL AND expires_at > NOW()`,
      [user.user_id, email]
    );

    if (result.rows.length === 0) {
      return { valid: false };
    }

    const { token_hash, expires_at } = result.rows[0];
    const otpHash = createHash("sha256").update(otp).digest("hex");

    if (otpHash !== token_hash) {
      return { valid: false };
    }

    // Mark token as consumed
    await (client ?? this.pool).query(
      `UPDATE identity_service.password_reset_tokens
       SET consumed_at = NOW()
       WHERE user_id = $1 AND email = $2`,
      [user.user_id, email]
    );

    // Generate a short-lived reset token
    const resetToken = this.generateResetToken();
    
    await (client ?? this.pool).query(
      `INSERT INTO identity_service.password_reset_tokens (user_id, token_hash, email, expires_at, consumed_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes', NOW())`,
      [user.user_id, this.hashOtp(resetToken), email]
    );

    return { valid: true, resetToken };
  }

  /** Reset the user's password using a reset token. */
  async resetPassword(resetToken: string, newPassword: string, client?: PoolClient): Promise<{ success: boolean }> {
    const otpHash = this.hashOtp(resetToken);
    
    const result = await (client ?? this.pool).query(
      `SELECT user_id FROM identity_service.password_reset_tokens
       WHERE token_hash = $1 AND consumed_at IS NULL AND expires_at > NOW()`,
      [otpHash]
    );

    if (result.rows.length === 0) {
      return { success: false };
    }

    const userId = result.rows[0].user_id;

    // Hash the new password
    const bcrypt = await import("bcrypt");
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update user's password (need to add password_hash column to users table)
    await (client ?? this.pool).query(
      `UPDATE identity_service.users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2`,
      [passwordHash, userId]
    );

    // Mark all reset tokens for this user as consumed
    await (client ?? this.pool).query(
      `UPDATE identity_service.password_reset_tokens
       SET consumed_at = NOW()
       WHERE user_id = $1 AND consumed_at IS NULL`,
      [userId]
    );

    // Revoke all sessions for this user
    await this.sessionService.revokeAllForUser(result.rows[0].user_id);

    return { success: true };
  }

  private generateResetToken(): string {
    return randomBytes(32).toString("base64url");
  }
}