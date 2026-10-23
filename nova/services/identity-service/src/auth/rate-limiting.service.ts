/** Rate limiting and account lockout service for identity service. */

import { Injectable, Inject } from "@nestjs/common";
import { Pool, PoolClient } from "pg";

@Injectable()
export class RateLimitingService {
  constructor(@Inject("PG_POOL") private readonly pool: Pool) {}

  async checkRateLimit(
    identifier: string,
    action: string,
    maxAttempts: number,
    windowMinutes: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - (now.getMinutes() % windowMinutes) * 60000);
    const expiresAt = new Date(windowStart.getTime() + windowMinutes * 60000);

    const result = await this.pool.query(
      `INSERT INTO identity_service.rate_limit_counters (identifier, action, count, window_start, expires_at)
       VALUES ($1, $2, 1, $3, $4)
       ON CONFLICT (identifier, action, window_start) DO UPDATE SET
         count = rate_limit_counters.count + 1
       RETURNING count`,
      [identifier, action, windowStart, expiresAt]
    );

    const count = parseInt(result.rows[0].count, 10);
    const allowed = count <= maxAttempts;
    const remaining = Math.max(0, maxAttempts - count);

    return { allowed, remaining, resetAt: expiresAt };
  }

  async lockAccount(
    userId: string,
    reason: string,
    lockoutMinutes: number = 30
  ): Promise<string> {
    const unlockAt = new Date(Date.now() + lockoutMinutes * 60000);
    const result = await this.pool.query(
      `INSERT INTO identity_service.account_lockouts (user_id, reason, failed_attempts, locked_at, unlock_at)
       VALUES ($1, $2, 1, NOW(), $3)
       ON CONFLICT (user_id) DO UPDATE SET
         reason = EXCLUDED.reason,
         failed_attempts = account_lockouts.failed_attempts + 1,
         locked_at = NOW(),
         unlock_at = EXCLUDED.unlock_at
       RETURNING lockout_id`,
      [userId, reason, new Date(Date.now() + lockoutMinutes * 60000)]
    );
    return result.rows[0].lockout_id;
  }

  async unlockAccount(userId: string, unlockedBy: string = "auto"): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE identity_service.account_lockouts
       SET unlocked_at = NOW(), unlocked_by = $1
       WHERE user_id = $2 AND unlocked_at IS NULL`,
      [unlockedBy, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async isAccountLocked(userId: string): Promise<{ locked: boolean; reason: string; unlockAt: Date } | null> {
    const result = await this.pool.query(
      `SELECT unlock_at > NOW() AS locked, reason, unlock_at
       FROM identity_service.account_lockouts
       WHERE user_id = $1 AND unlocked_at IS NULL AND unlock_at > NOW()
       ORDER BY locked_at DESC LIMIT 1`,
      [userId]
    );
    if (result.rowCount === 0) return null;
    return result.rows[0];
  }

  async recordFailedLogin(
    userId: string,
    ipAddress: string,
    reason: string = "failed_login"
  ): Promise<{ locked: boolean; lockoutId: string; unlockAt: Date }> {
    await this.checkRateLimit(ipAddress, "login", 5, 15);

    const locked = await this.isAccountLocked(userId);
    if (locked) return { locked: true, lockoutId: "", unlockAt: locked.unlockAt };

    await this.checkRateLimit(userId, "login", 5, 15);

    const result = await this.pool.query(
      `INSERT INTO identity_service.account_lockouts (user_id, reason, failed_attempts, locked_at, unlock_at)
       VALUES ($1, $2, 1, NOW(), NOW() + INTERVAL '30 minutes')
       ON CONFLICT (user_id) DO UPDATE SET
         failed_attempts = account_lockouts.failed_attempts + 1,
         locked_at = NOW(),
         unlock_at = NOW() + INTERVAL '30 minutes'
       RETURNING lockout_id, unlock_at`,
      [userId, reason]
    );

    const lockoutId = result.rows[0].lockout_id;
    const unlockAt = result.rows[0].unlock_at;

    const lockout = await this.pool.query(
      `SELECT failed_attempts FROM identity_service.account_lockouts WHERE user_id = $1`,
      [userId]
    );

    if (lockout.rows[0]?.failed_attempts >= 5) {
      return { locked: true, lockoutId: result.rows[0].lockout_id, unlockAt: result.rows[0].unlock_at };
    }

    return { locked: false, lockoutId: "", unlockAt: new Date() };
  }

  async clearFailedAttempts(userId: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM identity_service.account_lockouts WHERE user_id = $1 AND unlocked_at IS NULL`,
      [userId]
    );
  }

  async cleanupRateLimits(): Promise<number> {
    const result = await this.pool.query(
      `DELETE FROM identity_service.rate_limit_counters WHERE expires_at <= NOW()`
    );
    return result.rowCount ?? 0;
  }

  async cleanupLockouts(): Promise<number> {
    const result = await this.pool.query(
      `DELETE FROM identity_service.account_lockouts WHERE unlock_at <= NOW() AND unlocked_at IS NULL`
    );
    return result.rowCount ?? 0;
  }
}
