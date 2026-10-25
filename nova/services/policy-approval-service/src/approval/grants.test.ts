/** Tests for the approval grant binding. Runs against the in-memory
 * repository; no database. The cases mirror the Module 08 task 4 acceptance
 * list: canonical retransmission valid, material change invalid, identity
 * cross-checks, expiry, policy version, unknown nonce. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { GrantsService, GrantValidationError, InMemoryGrantRepository, CreateGrantInput, ConsumeVerdict, GrantRepository } from "./grants.service.js";
import { GrantsController } from "./grants.controller.js";
import { GrantVerifyAttempt } from "./grant-binding.js";

const UUID = "8f2dc4e0-3f2a-4b8e-9d11-5a9b7c2e6f01";
const OTHER_UUID = "3b9a1f2e-6c4d-42e8-8a70-1d5e9f3b2c44";
const NOW = 1_700_000_000_000;

function service(): { grantsService: GrantsService } {
  return { grantsService: new GrantsService(new InMemoryGrantRepository()) };
}

function grantInput(overrides: Partial<CreateGrantInput> = {}): CreateGrantInput {
  return {
    userId: UUID,
    service: "inbox-service",
    action: "send",
    target: "message:draft-1",
    payload: { body: "hello", to: "x@example.com" },
    ttlSeconds: 300,
    nowMs: NOW,
    ...overrides,
  };
}

function verifyInput(overrides: Partial<GrantVerifyAttempt> = {}): GrantVerifyAttempt {
  return {
    userId: UUID,
    service: "inbox-service",
    target: "message:draft-1",
    payload: { body: "hello", to: "x@example.com" },
    policyVersion: "1",
    nowMs: NOW,
    ...overrides,
  };
}

test("create and verify the same payload succeeds", () => {
  const { grantsService } = service();
  const record = grantsService.createGrant(grantInput());
  assert.equal(record.nonce.length, 32);
  assert.equal(record.payloadHash.length, 64);
  assert.equal(grantsService.verifyGrant(record.nonce, verifyInput({ nowMs: NOW + 1000 })).ok, true);
});

test("canonical retransmission stays valid across key order and whitespace", () => {
  const { grantsService } = service();
  const record = grantsService.createGrant(grantInput());
  const reordered = verifyInput({ payload: { to: "x@example.com", body: "hello" }, nowMs: NOW + 1000 });
  assert.equal(grantsService.verifyGrant(record.nonce, reordered).ok, true);
});

test("one material value change invalidates the grant", () => {
  const { grantsService } = service();
  const record = grantsService.createGrant(grantInput());
  const altered = verifyInput({ payload: { body: "hello ", to: "x@example.com" }, nowMs: NOW + 1000 });
  const verdict = grantsService.verifyGrant(record.nonce, altered);
  assert.deepEqual(verdict, { ok: false, reason: "payload_hash_mismatch" });
});

test("a non-UUID user is rejected at creation and at verification", () => {
  const { grantsService } = service();
  assert.throws(() => grantsService.createGrant(grantInput({ userId: "alice" })), GrantValidationError);
  assert.throws(() => grantsService.createGrant(grantInput({ userId: "not a uuid" })), GrantValidationError);
  const record = grantsService.createGrant(grantInput());
  // WHY: record.userId is a UUID, so the attempt never matches a non-UUID form.
  const verdict = grantsService.verifyGrant(record.nonce, verifyInput({ userId: "alice", nowMs: NOW + 1000 }));
  assert.deepEqual(verdict, { ok: false, reason: "invalid_user" });
});

test("cross-user verification is denied", () => {
  const { grantsService } = service();
  const record = grantsService.createGrant(grantInput());
  const verdict = grantsService.verifyGrant(record.nonce, verifyInput({ userId: OTHER_UUID, nowMs: NOW + 1000 }));
  assert.deepEqual(verdict, { ok: false, reason: "user_mismatch" });
});

test("cross-service and cross-target verification are denied", () => {
  const { grantsService } = service();
  const record = grantsService.createGrant(grantInput());
  assert.deepEqual(
    grantsService.verifyGrant(record.nonce, verifyInput({ service: "calendar-service", nowMs: NOW + 1000 })),
    { ok: false, reason: "service_mismatch" },
  );
  assert.deepEqual(
    grantsService.verifyGrant(record.nonce, verifyInput({ target: "message:draft-2", nowMs: NOW + 1000 })),
    { ok: false, reason: "target_mismatch" },
  );
});

test("an expired grant is denied", () => {
  const { grantsService } = service();
  const record = grantsService.createGrant(grantInput({ ttlSeconds: 60 }));
  assert.equal(grantsService.verifyGrant(record.nonce, verifyInput({ nowMs: NOW + 59_000 })).ok, true);
  assert.deepEqual(
    grantsService.verifyGrant(record.nonce, verifyInput({ nowMs: NOW + 60_000 })),
    { ok: false, reason: "expired" },
  );
});

test("a policy version change is denied", () => {
  const { grantsService } = service();
  const record = grantsService.createGrant(grantInput());
  assert.deepEqual(
    grantsService.verifyGrant(record.nonce, verifyInput({ policyVersion: 2, nowMs: NOW + 1000 })),
    { ok: false, reason: "policy_version_mismatch" },
  );
  // The numeric form of the pinned version still verifies.
  assert.equal(grantsService.verifyGrant(record.nonce, verifyInput({ policyVersion: 1, nowMs: NOW + 1000 })).ok, true);
});

test("an unknown nonce is denied cleanly", () => {
  const { grantsService } = service();
  assert.deepEqual(
    grantsService.verifyGrant("ab".repeat(16), verifyInput()),
    { ok: false, reason: "unknown_nonce" },
  );
});

test("the wired verify path judges expiry with the server clock, not a caller clock", () => {
  const { grantsService } = service();
  // WHY: create the grant already expired relative to the real clock, then
  // forge a caller clock that claims the action is still in time. Only a
  // server-side clock denies; a caller-controlled clock would verify.
  const hourAgo = Date.now() - 3_600_000;
  const record = grantsService.createGrant(grantInput({ ttlSeconds: 60, nowMs: hourAgo }));
  assert.deepEqual(
    grantsService.verifyGrant(record.nonce, verifyInput({ nowMs: hourAgo + 60_000 })),
    { ok: false, reason: "expired" },
  );
  const controller = new GrantsController(grantsService);
  const forgedClock = hourAgo + 1000; // claims the grant is still fresh
  const verdict = controller.verify(record.nonce, { ...verifyInput({ nowMs: forgedClock }), nowMs: forgedClock });
  assert.deepEqual(verdict, { ok: false, reason: "expired" });
});

test("invalid creation inputs all throw with a reason code", () => {
  const { grantsService } = service();
  assert.throws(() => grantsService.createGrant(grantInput({ ttlSeconds: 0 })), GrantValidationError);
  assert.throws(() => grantsService.createGrant(grantInput({ ttlSeconds: -5 })), GrantValidationError);
  assert.throws(() => grantsService.createGrant(grantInput({ service: "" })), GrantValidationError);
  assert.throws(() => grantsService.createGrant(grantInput({ action: "" })), GrantValidationError);
  assert.throws(() => grantsService.createGrant(grantInput({ target: "" })), GrantValidationError);
  try {
    grantsService.createGrant(grantInput({ payload: { body: NaN } }));
    assert.fail("expected throw");
  } catch (error) {
    assert.ok(error instanceof GrantValidationError);
    assert.equal((error as GrantValidationError).code, "invalid_payload");
  }
});

import type { GrantRecord } from "./grant-binding.js";
import type { RevokeVerdict } from "./grants.service.js";

/** Test-only repository that simulates an async race between check and consume/revoke. */
class RaceTestRepository implements GrantRepository {
  private readonly grants = new Map<string, GrantRecord>();

  save(record: GrantRecord): void {
    this.grants.set(record.nonce, record);
  }

  findByNonce(nonce: string): GrantRecord | null {
    return this.grants.get(nonce) ?? null;
  }

  async tryConsume(nonce: string, nowMs: number): Promise<ConsumeVerdict> {
    const record = this.grants.get(nonce);
    if (record === undefined) {
      return { ok: false, reason: "unknown_nonce" };
    }
    if (record.consumedAtMs !== null) {
      return { ok: false, reason: "already_used" };
    }
    if (record.revokedAtMs !== null) {
      return { ok: false, reason: "already_revoked" };
    }
    // WHY: yield between check and mutation to force the race window.
    await Promise.resolve();
    // Re-check after yield: another thread may have consumed.
    const current = this.grants.get(nonce);
    if (current === undefined || current.consumedAtMs !== null || current.revokedAtMs !== null) {
      return { ok: false, reason: "already_used" };
    }
    const consumedRecord: GrantRecord = {
      ...record,
      consumedAtMs: nowMs,
    };
    this.grants.set(nonce, consumedRecord);
    return { ok: true, consumedAtMs: nowMs };
  }

  async tryRevoke(nonce: string, nowMs: number): Promise<RevokeVerdict> {
    const record = this.grants.get(nonce);
    if (record === undefined) {
      return { ok: false, reason: "unknown_nonce" };
    }
    if (record.consumedAtMs !== null) {
      return { ok: false, reason: "already_used" };
    }
    if (record.revokedAtMs !== null) {
      // WHY: idempotent — re-revoking returns success with the original timestamp.
      return { ok: true, revokedAtMs: record.revokedAtMs };
    }
    // WHY: yield between check and mutation to force the race window.
    await Promise.resolve();
    // Re-check after yield: another thread may have revoked.
    const current = this.grants.get(nonce);
    if (current === undefined || current.consumedAtMs !== null) {
      return { ok: false, reason: "already_used" };
    }
    if (current.revokedAtMs !== null) {
      return { ok: true, revokedAtMs: current.revokedAtMs };
    }
    const revokedRecord: GrantRecord = {
      ...record,
      revokedAtMs: nowMs,
    };
    this.grants.set(nonce, revokedRecord);
    return { ok: true, revokedAtMs: nowMs };
  }
}

test("consume is single-use: concurrent consume calls on same nonce yield exactly one success", async () => {
  const raceRepo = new RaceTestRepository();
  const grantsService = new GrantsService(raceRepo);
  const record = grantsService.createGrant(grantInput());
  // Two concurrent consume calls on the same nonce.
  const [result1, result2] = await Promise.all([
    grantsService.consumeGrant(record.nonce),
    grantsService.consumeGrant(record.nonce),
  ]);
  const successes = [result1, result2].filter((r) => r.ok).length;
  assert.equal(successes, 1, "exactly one consume must succeed");
  const failure = [result1, result2].find((r) => !r.ok);
  assert.deepEqual(failure, { ok: false, reason: "already_used" });
});

test("verifyBinding returns ok on consumed grant (binding valid, just spent)", () => {
  const { grantsService } = service();
  const record = grantsService.createGrant(grantInput());
  // Consume via service directly (bypassing race repo for this check).
  grantsService.consumeGrant(record.nonce);
  // Binding is still valid; consumption is separate from binding.
  assert.equal(grantsService.verifyGrant(record.nonce, verifyInput({ nowMs: NOW + 1000 })).ok, true);
});

test("consume with malformed nonce throws validation error", async () => {
  const { grantsService } = service();
  await assert.rejects(grantsService.consumeGrant("not-hex"), GrantValidationError);
  await assert.rejects(grantsService.consumeGrant("ab".repeat(15)), GrantValidationError);
});

test("revoke succeeds on active grant", async () => {
  const { grantsService } = service();
  const record = grantsService.createGrant(grantInput());
  const verdict = await grantsService.revokeGrant(record.nonce);
  assert.equal(verdict.ok, true);
  assert.ok(typeof verdict.revokedAtMs === "number");
  // Second revoke is idempotent — returns same timestamp.
  const verdict2 = await grantsService.revokeGrant(record.nonce);
  assert.equal(verdict2.ok, true);
  assert.equal(verdict2.revokedAtMs, verdict.revokedAtMs);
});

test("revoke on consumed grant fails with already_used", async () => {
  const { grantsService } = service();
  const record = grantsService.createGrant(grantInput());
  await grantsService.consumeGrant(record.nonce);
  const verdict = await grantsService.revokeGrant(record.nonce);
  assert.deepEqual(verdict, { ok: false, reason: "already_used" });
});

test("consume on revoked grant fails with already_revoked", async () => {
  const { grantsService } = service();
  const record = grantsService.createGrant(grantInput());
  await grantsService.revokeGrant(record.nonce);
  const verdict = await grantsService.consumeGrant(record.nonce);
  assert.deepEqual(verdict, { ok: false, reason: "already_revoked" });
});

test("verify denies revoked grant before expiry check", async () => {
  const { grantsService } = service();
  const record = grantsService.createGrant(grantInput({ ttlSeconds: 300 }));
  await grantsService.revokeGrant(record.nonce);
  // Grant is revoked but not expired — verifyBinding should deny as "revoked"
  const verdict = grantsService.verifyGrant(record.nonce, verifyInput({ nowMs: NOW + 1000 }));
  assert.deepEqual(verdict, { ok: false, reason: "revoked" });
});

test("revoke with malformed nonce throws validation error", async () => {
  const { grantsService } = service();
  await assert.rejects(grantsService.revokeGrant("not-hex"), GrantValidationError);
  await assert.rejects(grantsService.revokeGrant("ab".repeat(15)), GrantValidationError);
});

test("concurrent revoke calls on same nonce are idempotent (both succeed with same timestamp)", async () => {
  const raceRepo = new RaceTestRepository();
  const grantsService = new GrantsService(raceRepo);
  const record = grantsService.createGrant(grantInput());
  // Two concurrent revoke calls on the same nonce.
  const [result1, result2] = await Promise.all([
    grantsService.revokeGrant(record.nonce),
    grantsService.revokeGrant(record.nonce),
  ]);
  assert.equal(result1.ok, true);
  assert.equal(result2.ok, true);
  assert.equal(result1.revokedAtMs, result2.revokedAtMs, "both revokes must return the same timestamp");
});

test("concurrent consume vs revoke on same nonce: exactly one succeeds", async () => {
  const raceRepo = new RaceTestRepository();
  const grantsService = new GrantsService(raceRepo);
  const record = grantsService.createGrant(grantInput());
  // Two concurrent calls: one consume, one revoke.
  const [consumeResult, revokeResult] = await Promise.all([
    grantsService.consumeGrant(record.nonce),
    grantsService.revokeGrant(record.nonce),
  ]);
  // Exactly one must succeed; the other fails with the correct reason.
  const successes = [consumeResult, revokeResult].filter((r) => r.ok).length;
  assert.equal(successes, 1, "exactly one of consume/revoke must succeed");
  const failure = [consumeResult, revokeResult].find((r) => !r.ok);
  if (consumeResult.ok) {
    // Revoke should have failed because consume won.
    assert.deepEqual(revokeResult, { ok: false, reason: "already_used" });
  } else {
    // Consume should have failed because revoke won.
    assert.deepEqual(consumeResult, { ok: false, reason: "already_revoked" });
  }
});
