/** Tests for the approval grant binding. Runs against the in-memory
 * repository; no database. The cases mirror the Module 08 task 4 acceptance
 * list: canonical retransmission valid, material change invalid, identity
 * cross-checks, expiry, policy version, unknown nonce. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { computeApprovalHash } from "@nova/contracts/approval-hash";
import { GrantsService, GrantValidationError, EditGrantInput } from "./grants.service.js";
import { CreateGrantInput, CreateGrantWithDetailsInput } from "./grant-creation.js";
import { InMemoryGrantRepository } from "./grant-repository.js";
import { GrantRepository, ConsumeVerdict, RevokeVerdict, StatusVerdict, EditVerdict } from "./grant-repository-types.js";
import { MAX_PREVIEW_BYTES } from "./grant-card.js";
import { GrantsController } from "./grants.controller.js";
import { GrantVerifyAttempt } from "./grant-binding.js";
import { PolicyDecisionService } from "../policy/policy-decision.service.js";

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
    action: "inbox.send",
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
    action: "inbox.send",
    target: "message:draft-1",
    payload: { body: "hello", to: "x@example.com" },
    policyVersion: "1",
    nowMs: NOW,
    ...overrides,
  };
}

test("create and verify the same payload succeeds", async () => {
  const { grantsService } = service();
  const record = await grantsService.createGrant(grantInput());
  assert.equal(record.nonce.length, 32);
  assert.equal(record.payloadHash.length, 64);
  assert.equal(grantsService.verifyGrant(record.nonce, verifyInput({ nowMs: NOW + 1000 })).ok, true);
});

test("canonical retransmission stays valid across key order and whitespace", async () => {
  const { grantsService } = service();
  const record = await grantsService.createGrant(grantInput());
  const reordered = verifyInput({ payload: { to: "x@example.com", body: "hello" }, nowMs: NOW + 1000 });
  assert.equal(grantsService.verifyGrant(record.nonce, reordered).ok, true);
});

test("one material value change invalidates the grant", async () => {
  const { grantsService } = service();
  const record = await grantsService.createGrant(grantInput());
  const altered = verifyInput({ payload: { body: "hello ", to: "x@example.com" }, nowMs: NOW + 1000 });
  const verdict = grantsService.verifyGrant(record.nonce, altered);
  assert.deepEqual(verdict, { ok: false, reason: "payload_hash_mismatch" });
});

test("a non-UUID user is rejected at creation and at verification", async () => {
  const { grantsService } = service();
  await assert.rejects(async () => await grantsService.createGrant(grantInput({ userId: "alice" })));
  await assert.rejects(async () => await grantsService.createGrant(grantInput({ userId: "not a uuid" })), GrantValidationError);
  const record = await grantsService.createGrant(grantInput());
  // WHY: record.userId is a UUID, so the attempt never matches a non-UUID form.
  const verdict = grantsService.verifyGrant(record.nonce, verifyInput({ userId: "alice", nowMs: NOW + 1000 }));
  assert.deepEqual(verdict, { ok: false, reason: "invalid_user" });
});

test("cross-user verification is denied", async () => {
  const { grantsService } = service();
  const record = await grantsService.createGrant(grantInput());
  const verdict = grantsService.verifyGrant(record.nonce, verifyInput({ userId: OTHER_UUID, nowMs: NOW + 1000 }));
  assert.deepEqual(verdict, { ok: false, reason: "user_mismatch" });
});

test("cross-service and cross-target verification are denied", async () => {
  const { grantsService } = service();
  const record = await grantsService.createGrant(grantInput());
  assert.deepEqual(
    grantsService.verifyGrant(record.nonce, verifyInput({ service: "calendar-service", nowMs: NOW + 1000 })),
    { ok: false, reason: "service_mismatch" },
  );
  assert.deepEqual(
    grantsService.verifyGrant(record.nonce, verifyInput({ target: "message:draft-2", nowMs: NOW + 1000 })),
    { ok: false, reason: "target_mismatch" },
  );
});

test("an expired grant is denied", async () => {
  const { grantsService } = service();
  const record = await grantsService.createGrant(grantInput({ ttlSeconds: 60 }));
  assert.equal(grantsService.verifyGrant(record.nonce, verifyInput({ nowMs: NOW + 59_000 })).ok, true);
  assert.deepEqual(
    grantsService.verifyGrant(record.nonce, verifyInput({ nowMs: NOW + 60_000 })),
    { ok: false, reason: "expired" },
  );
});

test("a policy version change is denied", async () => {
  const { grantsService } = service();
  const record = await grantsService.createGrant(grantInput());
  assert.deepEqual(
    grantsService.verifyGrant(record.nonce, verifyInput({ policyVersion: 2, nowMs: NOW + 1000 })),
    { ok: false, reason: "policy_version_mismatch" },
  );
  // The numeric form of the pinned version still verifies.
  assert.equal(grantsService.verifyGrant(record.nonce, verifyInput({ policyVersion: 1, nowMs: NOW + 1000 })).ok, true);
});

test("an unknown nonce is denied cleanly", async () => {
  const { grantsService } = service();
  assert.deepEqual(
    grantsService.verifyGrant("ab".repeat(16), verifyInput()),
    { ok: false, reason: "unknown_nonce" },
  );
});

test("the wired verify path judges expiry with the server clock, not a caller clock", async () => {
  const { grantsService } = service();
  // WHY: create the grant already expired relative to the real clock, then
  // forge a caller clock that claims the action is still in time. Only a
  // server-side clock denies; a caller-controlled clock would verify.
  const hourAgo = Date.now() - 3_600_000;
  const record = await grantsService.createGrant(grantInput({ ttlSeconds: 60, nowMs: hourAgo }));
  assert.deepEqual(
    grantsService.verifyGrant(record.nonce, verifyInput({ nowMs: hourAgo + 60_000 })),
    { ok: false, reason: "expired" },
  );
  const controller = new GrantsController(grantsService);
  const forgedClock = hourAgo + 1000; // claims the grant is still fresh
  const verdict = controller.verify(record.nonce, { ...verifyInput({ nowMs: forgedClock }), nowMs: forgedClock });
  assert.deepEqual(verdict, { ok: false, reason: "expired" });
});

test("invalid creation inputs all throw with a reason code", async () => {
  const { grantsService } = service();
  await assert.rejects(async () => await grantsService.createGrant(grantInput({ ttlSeconds: 0 })), GrantValidationError);
  await assert.rejects(async () => await grantsService.createGrant(grantInput({ ttlSeconds: -5 })), GrantValidationError);
  await assert.rejects(async () => await grantsService.createGrant(grantInput({ service: "" })), GrantValidationError);
  await assert.rejects(async () => await grantsService.createGrant(grantInput({ action: "" })), GrantValidationError);
  await assert.rejects(async () => await grantsService.createGrant(grantInput({ target: "" })), GrantValidationError);
  try {
    await grantsService.createGrant(grantInput({ payload: { body: NaN } }));
    assert.fail("expected throw");
  } catch (error) {
    assert.ok(error instanceof GrantValidationError);
    assert.equal((error as GrantValidationError).code, "invalid_payload");
  }
});

import type { GrantRecord } from "./grant-binding.js";

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

  async updateStatus(
    nonce: string,
    status: "approved" | "denied" | "expired" | "revoked",
    decidedBy: string,
    nowMs: number
  ): Promise<{ ok: true; decidedAtMs: number } | { ok: false; reason: "unknown_nonce" }> {
    const record = this.grants.get(nonce);
    if (record === undefined) {
      return { ok: false, reason: "unknown_nonce" };
    }
    await Promise.resolve();
    const fresh = this.grants.get(nonce);
    if (fresh === undefined) {
      return { ok: false, reason: "unknown_nonce" };
    }
    const updatedRecord: GrantRecord = { ...fresh };
    (updatedRecord as any).status = status;
    (updatedRecord as any).decidedAtMs = nowMs;
    (updatedRecord as any).decidedBy = decidedBy;
    this.grants.set(nonce, updatedRecord);
    return { ok: true, decidedAtMs: nowMs };
  }

  async editGrant(
    nonce: string,
    newPayload: unknown,
    newPayloadHash: string,
    newCardHash: string | undefined,
    newPreview: unknown | undefined,
    newPermissions: readonly string[] | undefined,
    newConsequence: string | undefined,
    newRuleId: string | undefined,
    newExpiresAtMs: number,
    nowMs: number
  ): Promise<GrantRecord | { ok: false; reason: "unknown_nonce" | "already_terminal" }> {
    const record = this.grants.get(nonce);
    if (record === undefined) {
      return { ok: false, reason: "unknown_nonce" };
    }
    await Promise.resolve();
    const fresh = this.grants.get(nonce);
    if (fresh === undefined) {
      return { ok: false, reason: "unknown_nonce" };
    }
    if (fresh.consumedAtMs !== null || fresh.revokedAtMs !== null || (fresh as any).status) {
      return { ok: false, reason: "already_terminal" };
    }
    const editedRecord: GrantRecord = {
      ...fresh,
      payloadHash: newPayloadHash,
      preview: newPreview,
      cardHash: newCardHash,
      permissions: newPermissions,
      consequence: newConsequence,
      ruleId: newRuleId,
      expiresAtMs: newExpiresAtMs,
    };
    delete (editedRecord as any).status;
    delete (editedRecord as any).decidedAtMs;
    delete (editedRecord as any).decidedBy;
    this.grants.set(nonce, editedRecord);
    return editedRecord;
  }
}

test("consume is single-use: concurrent consume calls on same nonce yield exactly one success", async () => {
  const raceRepo = new RaceTestRepository();
  const grantsService = new GrantsService(raceRepo);
  const record = await grantsService.createGrant(grantInput());
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

test("verifyBinding returns ok on consumed grant (binding valid, just spent)", async () => {
  const { grantsService } = service();
  const record = await grantsService.createGrant(grantInput());
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
  const record = await grantsService.createGrant(grantInput());
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
  const record = await grantsService.createGrant(grantInput());
  await grantsService.consumeGrant(record.nonce);
  const verdict = await grantsService.revokeGrant(record.nonce);
  assert.deepEqual(verdict, { ok: false, reason: "already_used" });
});

test("consume on revoked grant fails with already_revoked", async () => {
  const { grantsService } = service();
  const record = await grantsService.createGrant(grantInput());
  await grantsService.revokeGrant(record.nonce);
  const verdict = await grantsService.consumeGrant(record.nonce);
  assert.deepEqual(verdict, { ok: false, reason: "already_revoked" });
});

test("verify denies revoked grant before expiry check", async () => {
  const { grantsService } = service();
  const record = await grantsService.createGrant(grantInput({ ttlSeconds: 300 }));
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
  const record = await grantsService.createGrant(grantInput());
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
  const record = await grantsService.createGrant(grantInput());
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

function grantWithDetailsInput(overrides: Partial<CreateGrantWithDetailsInput> = {}): CreateGrantWithDetailsInput {
  return {
    userId: UUID,
    service: "inbox-service",
    action: "inbox.send",
    target: "message:draft-1",
    payload: { body: "hello", to: "x@example.com" },
    ttlSeconds: 300,
    nowMs: NOW,
    ...overrides,
  };
}

test("create grant with details and get card verifies hash", async () => {
  const { grantsService } = service();
  const preview = { body: "hello", to: "x@example.com" };
  const record = await grantsService.createGrantWithDetails(grantWithDetailsInput({ preview }));
  assert.ok(record.cardHash);
  assert.equal(record.cardHash.length, 64);
  const card = await grantsService.getGrantCard(record.nonce, "inbox-service");
  assert.ok(card);
  assert.deepEqual(card.preview, preview);
  assert.equal(card.cardHash, record.cardHash);
  // Client-side verification: compute hash of displayed preview
  const clientHash = computeApprovalHash(card.preview);
  assert.equal(clientHash, card.cardHash);
});

test("edit preview locally causes hash mismatch", async () => {
  const { grantsService } = service();
  const preview = { body: "hello", to: "x@example.com" };
  const record = await grantsService.createGrantWithDetails(grantWithDetailsInput({ preview }));
  const card = await grantsService.getGrantCard(record.nonce, "inbox-service");
  assert.ok(card);
  const originalHash = computeApprovalHash(card.preview!);
  assert.equal(originalHash, card.cardHash);
  // Edit the preview locally
  const editedPreview = { ...(card.preview as Record<string, unknown>), body: "hello world" };
  const editedHash = computeApprovalHash(editedPreview);
  assert.notEqual(editedHash, card.cardHash);
});

test("card endpoint returns 404 for wrong service", async () => {
  const { grantsService } = service();
  const record = await grantsService.createGrantWithDetails(grantWithDetailsInput({ preview: { body: "hello" } }));
  const card = await grantsService.getGrantCard(record.nonce, "calendar-service");
  assert.equal(card, null);
});

test("card endpoint returns 404 for unknown nonce", async () => {
  const { grantsService } = service();
  const card = await grantsService.getGrantCard("ab".repeat(16), "inbox-service");
  assert.equal(card, null);
});

test("card endpoint returns null for grant without preview", async () => {
  const { grantsService } = service();
  const record = await grantsService.createGrant(grantInput()); // no preview
  const card = await grantsService.getGrantCard(record.nonce, "inbox-service");
  assert.equal(card, null);
});

test("create grant with details validates preview size limit", async () => {
  const { grantsService } = service();
  const largePreview = { data: "x".repeat(MAX_PREVIEW_BYTES + 1) };
  await assert.rejects(async () => await grantsService.createGrantWithDetails(grantWithDetailsInput({ preview: largePreview })), GrantValidationError);
});

test("create grant with details stores provided permissions and consequence", async () => {
  const { grantsService } = service();
  const record = await grantsService.createGrantWithDetails(grantWithDetailsInput({
    action: "inbox.send",
    preview: { body: "hello" },
    ruleId: "test-rule",
    permissions: ["send"],
    consequence: "Medium risk: may modify own data",
  }));
  assert.ok(record.permissions);
  assert.ok(record.consequence);
  assert.ok(record.ruleId);
  assert.equal(record.ruleId, "test-rule");
  assert.deepEqual(record.permissions, ["send"]);
  assert.equal(record.consequence, "Medium risk: may modify own data");
});

test("rejects free-text payload at grant creation (Task 11)", async () => {
  const { grantsService } = service();
  const freeTexts = ["yes", "approve", "ok", "okay", "confirm", "agree", "allow", "sure", "y", "yep", "yeah"];
  for (const text of freeTexts) {
    await assert.rejects(async () => await grantsService.createGrant(grantInput({ payload: text })));
    await assert.rejects(async () => await grantsService.createGrantWithDetails(grantWithDetailsInput({ payload: text })));
  }
});

test("rejects free-text payload at verification (Task 11)", async () => {
  const { grantsService } = service();
  const record = await grantsService.createGrant(grantInput({ payload: { body: "hello" } }));
  const freeTexts = ["yes", "approve", "ok", "okay", "confirm", "agree", "allow", "sure", "y", "yep", "yeah"];
  for (const text of freeTexts) {
    const verdict = grantsService.verifyGrant(record.nonce, verifyInput({ payload: text }));
    assert.deepEqual(verdict, { ok: false, reason: "free_text_not_allowed" });
  }
  // Also reject string payloads that aren't in the free-text list
  const verdict = grantsService.verifyGrant(record.nonce, verifyInput({ payload: "some random string" }));
  assert.deepEqual(verdict, { ok: false, reason: "free_text_not_allowed" });
  // Reject null/undefined
  const verdictNull = grantsService.verifyGrant(record.nonce, verifyInput({ payload: null }));
  assert.deepEqual(verdictNull, { ok: false, reason: "free_text_not_allowed" });
  const verdictUndef = grantsService.verifyGrant(record.nonce, verifyInput({ payload: undefined }));
  assert.deepEqual(verdictUndef, { ok: false, reason: "free_text_not_allowed" });
  // Reject array
  const verdictArr = grantsService.verifyGrant(record.nonce, verifyInput({ payload: ["yes"] }));
  assert.deepEqual(verdictArr, { ok: false, reason: "free_text_not_allowed" });
});
