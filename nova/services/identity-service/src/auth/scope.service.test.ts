/** Tests for the scope service. */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { ScopeService } from "./scope.service.js";

describe("scope service", () => {
  let pool: Pool;
  let service: ScopeService;
  let testUserId: string;

  before(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    service = new ScopeService(pool);

    // Create test user
    const result = await pool.query(
      `INSERT INTO identity_service.users (email, email_verified) VALUES ($1, $2) RETURNING user_id`,
      ["test-scope@example.com", true]
    );
    testUserId = result.rows[0].user_id;

    // Ensure test integration scopes exist
    await pool.query(
      `INSERT INTO identity_service.integration_scopes (integration_name, scope_name, is_sensitive, required)
       VALUES 
         ('google', 'https://www.googleapis.com/auth/gmail.readonly', false, true),
         ('google', 'https://www.googleapis.com/auth/gmail.send', true, false),
         ('github', 'repo', true, false)
       ON CONFLICT (integration_name, scope_name) DO NOTHING`
    );
  });

  after(async () => {
    // Cleanup
    await pool.query(`DELETE FROM identity_service.user_scopes WHERE user_id = $1`, [testUserId]);
    await pool.query(`DELETE FROM identity_service.users WHERE user_id = $1`, [testUserId]);
    await pool.end();
  });

  it("grantUserScope grants a non-sensitive scope", async () => {
    const scopeId = await service.grantUserScope(testUserId, "google", "https://www.googleapis.com/auth/gmail.readonly");
    assert.ok(scopeId);

    const hasScope = await service.userHasScope(testUserId, "google", "https://www.googleapis.com/auth/gmail.readonly");
    assert.strictEqual(hasScope, true);
  });

  it("grantUserScope prevents scope escalation for sensitive scope without prior grant", async () => {
    // User has no sensitive scopes for google
    await assert.rejects(
      service.grantUserScope(testUserId, "google", "https://www.googleapis.com/auth/gmail.send"),
      /Scope escalation/
    );
  });

  it("grantUserScope allows sensitive scope if user already has one for same integration", async () => {
    // First grant a sensitive scope
    await service.grantUserScope(testUserId, "github", "repo", "system");
    
    // Now grant another sensitive scope for same integration - should succeed
    const scopeId = await service.grantUserScope(testUserId, "github", "repo");
    assert.ok(scopeId);
  });

  it("checkScopeEscalation returns true for non-sensitive scope", async () => {
    const allowed = await service.checkScopeEscalation(testUserId, "google", "https://www.googleapis.com/auth/gmail.readonly");
    assert.strictEqual(allowed, true);
  });

  it("checkScopeEscalation returns false for sensitive scope without prior grant", async () => {
    const allowed = await service.checkScopeEscalation(testUserId, "google", "https://www.googleapis.com/auth/gmail.send");
    assert.strictEqual(allowed, false);
  });

  it("checkScopeEscalation returns true for sensitive scope with prior grant", async () => {
    await service.grantUserScope(testUserId, "github", "repo", "system");
    const allowed = await service.checkScopeEscalation(testUserId, "github", "repo");
    assert.strictEqual(allowed, true);
  });

  it("revokeUserScope revokes a scope", async () => {
    await service.grantUserScope(testUserId, "google", "https://www.googleapis.com/auth/gmail.readonly");
    
    const revoked = await service.revokeUserScope(testUserId, "google", "https://www.googleapis.com/auth/gmail.readonly");
    assert.strictEqual(revoked, true);

    const hasScope = await service.userHasScope(testUserId, "google", "https://www.googleapis.com/auth/gmail.readonly");
    assert.strictEqual(hasScope, false);
  });

  it("getUserScopes returns all active scopes", async () => {
    await service.grantUserScope(testUserId, "google", "https://www.googleapis.com/auth/gmail.readonly");
    await service.grantUserScope(testUserId, "github", "repo", "system");
    
    const scopes = await service.getUserScopes(testUserId);
    assert.ok(scopes.length >= 2);
    assert.ok(scopes.some(s => s.integration_name === "google" && s.scope_name === "https://www.googleapis.com/auth/gmail.readonly"));
  });
});