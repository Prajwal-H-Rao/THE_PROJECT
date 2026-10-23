/** Tests for the base repository ownership checks. */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { UserRepository } from "../account/user.repository.js";
import { randomUUID } from "node:crypto";

describe("base repository ownership checks", () => {
  let pool: Pool;
  let userRepo: UserRepository;
  let userA: string;
  let userB: string;

  before(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    userRepo = new UserRepository(pool);

    // Create user A
    const resultA = await pool.query(
      `INSERT INTO identity_service.users (email, email_verified) VALUES ($1, $2) RETURNING user_id`,
      ["user-a@example.com", true]
    );
    userA = resultA.rows[0].user_id;

    // Create user B
    const resultB = await pool.query(
      `INSERT INTO identity_service.users (email, email_verified) VALUES ($1, $2) RETURNING user_id`,
      ["user-b@example.com", true]
    );
    userB = resultB.rows[0].user_id;

    // Create a session for user A
    await pool.query(
      `INSERT INTO identity_service.sessions (user_id, tenant_id, channel, expires_at, csrf_token)
       VALUES ($1, 'tenant', 'web', NOW() + INTERVAL '1 hour', 'csrf1')`,
      [userA]
    );

    // Create a session for user B
    await pool.query(
      `INSERT INTO identity_service.sessions (user_id, tenant_id, channel, expires_at, csrf_token)
       VALUES ($1, 'tenant', 'web', NOW() + INTERVAL '1 hour', 'csrf2')`,
      [userB]
    );
  });

  after(async () => {
    // Cleanup
    await pool.query(`DELETE FROM identity_service.sessions WHERE user_id = $1`, [userA]);
    await pool.query(`DELETE FROM identity_service.sessions WHERE user_id = $1`, [userB]);
    await pool.query(`DELETE FROM identity_service.users WHERE user_id = $1`, [userA]);
    await pool.query(`DELETE FROM identity_service.users WHERE user_id = $1`, [userB]);
    await pool.end();
  });

  it("findById returns own user record (self-ownership)", async () => {
    const user = await userRepo.findById(userA);
    assert.ok(user);
    assert.strictEqual(user.user_id, userA);
  });

  it("checkOwnership returns true for own session", async () => {
    // First get a session for user A
    const sessions = await pool.query(
      `SELECT session_id FROM identity_service.sessions WHERE user_id = $1`,
      [userA]
    );
    const sessionId = sessions.rows[0].session_id;

    const owns = await userRepo.checkOwnership(userA, "sessions", sessionId, "user_id");
    assert.strictEqual(owns, true);
  });

  it("checkOwnership returns false for cross-user session (cross-user read denied)", async () => {
    // Get a session for user B
    const sessions = await pool.query(
      `SELECT session_id FROM identity_service.sessions WHERE user_id = $1`,
      [userB]
    );
    const sessionId = sessions.rows[0].session_id;

    // User A tries to check ownership of User B's session
    const owns = await userRepo.checkOwnership(userA, "sessions", sessionId, "user_id");
    assert.strictEqual(owns, false);
  });

  it("enforceOwnership throws FORBIDDEN for cross-user access", async () => {
    // Get a session for user B
    const sessions = await pool.query(
      `SELECT session_id FROM identity_service.sessions WHERE user_id = $1`,
      [userB]
    );
    const sessionId = sessions.rows[0].session_id;

    await assert.rejects(
      userRepo.enforceOwnership(userA, "sessions", sessionId, "user_id"),
      /FORBIDDEN/
    );
  });

  it("findOwned returns null for cross-user session", async () => {
    // Get a session for user B
    const sessions = await pool.query(
      `SELECT session_id FROM identity_service.sessions WHERE user_id = $1`,
      [userB]
    );
    const sessionId = sessions.rows[0].session_id;

    const session = await userRepo.findOwned(userA, "sessions", sessionId, "user_id");
    assert.strictEqual(session, null);
  });

  it("findOwned returns session for own session", async () => {
    const sessions = await pool.query(
      `SELECT session_id FROM identity_service.sessions WHERE user_id = $1`,
      [userA]
    );
    const sessionId = sessions.rows[0].session_id;

    const session = await userRepo.findOwned<{ session_id: string }>(userA, "sessions", sessionId, "user_id");
    assert.ok(session);
    assert.strictEqual(session.session_id, sessionId);
  });
});