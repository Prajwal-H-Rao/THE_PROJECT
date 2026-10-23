/** Tests for the rate limiting and account lockout service. */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { RateLimitingService } from "./rate-limiting.service.js";

describe("rate limiting service", () => {
  let pool: Pool;
  let service: RateLimitingService;

  before(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    service = new RateLimitingService(pool);
  });

  after(async () => {
    await pool.end();
  });

  it("checkRateLimit allows requests within limit", async () => {
    const result = await service.checkRateLimit("test-ip", "login", 5, 15);
    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.remaining, 4);
  });

  it("checkRateLimit blocks when over limit", async () => {
    const identifier = "test-rate-limit-" + Date.now();
    for (let i = 0; i < 5; i++) {
      await service.checkRateLimit(identifier, "test-action", 5, 15);
    }
    const result = await service.checkRateLimit(identifier, "test-action", 5, 15);
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.remaining, 0);
  });

  it("lockAccount locks the account", async () => {
    const userId = randomUUID();
    const lockoutId = await service.lockAccount(userId, "test_reason", 30);
    assert.ok(lockoutId);

    const locked = await service.isAccountLocked(userId);
    assert.ok(locked);
    assert.strictEqual(locked.locked, true);
    assert.ok(locked.unlockAt);
  });

  it("unlockAccount unlocks the account", async () => {
    const userId = randomUUID();
    await service.lockAccount(userId, "test", 30);
    const unlocked = await service.unlockAccount(userId, "admin");
    assert.strictEqual(unlocked, true);

    const locked = await service.isAccountLocked(userId);
    assert.strictEqual(locked, null);
  });

  it("recordFailedLogin locks account after 5 failures", async () => {
    const userId = randomUUID();
    const ip = "192.168.1." + Math.floor(Math.random() * 255);

    for (let i = 0; i < 4; i++) {
      const result = await service.recordFailedLogin(userId, "192.168.1.100", "failed_login");
      assert.strictEqual(result.locked, false);
    }

    const result = await service.recordFailedLogin(userId, "192.168.1.100", "failed_login");
    assert.strictEqual(result.locked, true);
    assert.ok(result.lockoutId);
    assert.ok(result.unlockAt);
  });

  it("clearFailedAttempts removes lockout on successful login", async () => {
    const userId = randomUUID();
    await service.lockAccount(userId, "test", 30);
    let locked = await service.isAccountLocked(userId);
    assert.ok(locked);

    await service.clearFailedAttempts(userId);
    const cleared = await service.isAccountLocked(userId);
    assert.strictEqual(cleared, null);
  });
});
