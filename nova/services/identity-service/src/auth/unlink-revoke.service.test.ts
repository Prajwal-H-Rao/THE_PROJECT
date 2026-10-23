/** Tests for the unlink-revoke service. */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { UnlinkRevokeService } from "./unlink-revoke.service.js";
import { SessionService } from "../session/session.service.js";
import { SessionRepository } from "../session/session.repository.js";
import { TotpService } from "../totp/totp.service.js";
import { RefreshTokenService } from "./refresh-token.service.js";
import { ConfigService } from "@nestjs/config";

describe("unlink-revoke service", () => {
  let pool: Pool;
  let sessionRepo: SessionRepository;
  let sessionService: SessionService;
  let totpService: TotpService;
  let refreshTokenService: RefreshTokenService;
  let service: UnlinkRevokeService;
  let testUserId: string;

  before(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    sessionRepo = new SessionRepository(pool);
    sessionService = new SessionService(
      sessionRepo,
      pool,
      "test-secret-at-least-32-bytes-long",
      3600
    );
    totpService = new TotpService(pool);
    const config = new ConfigService();
    config.set("NOVA_REFRESH_TOKEN_MASTER_KEY", "test-master-key-32-bytes-long!!");
    refreshTokenService = new RefreshTokenService(pool, config);
    service = new UnlinkRevokeService(pool, sessionService, totpService, refreshTokenService);

    // Create test user
    const result = await pool.query(
      `INSERT INTO identity_service.users (email, email_verified) VALUES ($1, $2) RETURNING user_id`,
      ["test-revocation@example.com", true]
    );
    testUserId = result.rows[0].user_id;
  });

  after(async () => {
    // Cleanup
    await pool.query(`DELETE FROM identity_service.sessions WHERE user_id = $1`, [testUserId]);
    await pool.query(`DELETE FROM identity_service.refresh_tokens WHERE user_id = $1`, [testUserId]);
    await pool.query(`DELETE FROM identity_service.totp_secrets WHERE user_id = $1`, [testUserId]);
    await pool.query(`DELETE FROM identity_service.channel_identities WHERE user_id = $1`, [testUserId]);
    await pool.query(`DELETE FROM identity_service.users WHERE user_id = $1`, [testUserId]);
    await pool.end();
  });

  it("revokeAllSessions revokes all sessions for a user", async () => {
    // Create test sessions
    await pool.query(
      `INSERT INTO identity_service.sessions (user_id, tenant_id, channel, expires_at, csrf_token)
       VALUES ($1, 'tenant', 'web', NOW() + INTERVAL '1 hour', 'csrf1')`,
      [testUserId]
    );
    await pool.query(
      `INSERT INTO identity_service.sessions (user_id, tenant_id, channel, expires_at, csrf_token)
       VALUES ($1, 'tenant', 'mobile', NOW() + INTERVAL '1 hour', 'csrf2')`,
      [testUserId]
    );

    const revoked = await service.revokeAllSessions(testUserId);
    assert.strictEqual(revoked, 2);

    const active = await pool.query(
      `SELECT 1 FROM identity_service.sessions WHERE user_id = $1 AND revoked_at IS NULL`,
      [testUserId]
    );
    assert.strictEqual(active.rowCount, 0);
  });

  it("revokeAllUserAccess revokes all access for a user", async () => {
    // Create test data
    await pool.query(
      `INSERT INTO identity_service.sessions (user_id, tenant_id, channel, expires_at, csrf_token)
       VALUES ($1, 'tenant', 'web', NOW() + INTERVAL '1 hour', 'csrf3')`,
      [testUserId]
    );
    await pool.query(
      `INSERT INTO identity_service.refresh_tokens (user_id, provider, encrypted_token, key_id, scope, expires_at)
       VALUES ($1, 'test', 'encrypted', 'v1', 'test', NOW() + INTERVAL '1 day')`,
      [testUserId]
    );
    await pool.query(
      `INSERT INTO identity_service.totp_secrets (user_id, secret, backup_codes, enabled_at)
       VALUES ($1, 'secret', '[]', NOW())`,
      [testUserId]
    );
    await pool.query(
      `INSERT INTO identity_service.channel_identities (user_id, provider, provider_user_id, provider_data, linked_at)
       VALUES ($1, 'google', 'user123', '{}', NOW())`,
      [testUserId]
    );

    const result = await service.revokeAllUserAccess(testUserId);
    assert.strictEqual(result.sessionsRevoked, 1);
    assert.strictEqual(result.refreshTokensRevoked, 1);
    assert.strictEqual(result.totpRevoked, true);
    assert.strictEqual(result.channelsUnlinked, 1);
  });

  it("revokeAllUserAccess blocks subsequent access", async () => {
    // Create a new test user for this test
    const result = await pool.query(
      `INSERT INTO identity_service.users (email, email_verified) VALUES ($1, $2) RETURNING user_id`,
      ["test-access@example.com", true]
    );
    const userId = result.rows[0].user_id;

    await pool.query(
      `INSERT INTO identity_service.sessions (user_id, tenant_id, channel, expires_at, csrf_token)
       VALUES ($1, 'tenant', 'web', NOW() + INTERVAL '1 hour', 'csrf')`,
      [userId]
    );

    await service.revokeAllUserAccess(userId);

    const sessionResult = await pool.query(
      `SELECT 1 FROM identity_service.sessions WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );
    assert.strictEqual(sessionResult.rowCount, 0);

    // Cleanup
    await pool.query(`DELETE FROM identity_service.users WHERE user_id = $1`, [userId]);
  });
});