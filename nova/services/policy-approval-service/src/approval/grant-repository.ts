/** The grant repository implementation. Implements in-memory storage with
 *  atomic check-and-set for consumption and revocation. The RaceTestRepository
 *  lives in the test file to keep this file under 200 lines. */

import { randomUUID } from "node:crypto";
import type { GrantRecord } from "./grant-binding.js";
import {
  GrantRepository,
  ConsumeVerdict,
  RevokeVerdict
} from "./grant-repository-types.js";

/** In-memory repository. Declared stub; the SQL adapter swaps in later. */
export class InMemoryGrantRepository implements GrantRepository {
  private readonly grants = new Map<string, GrantRecord>();

  /** Store one grant under its nonce. */
  save(record: GrantRecord): void {
    this.grants.set(record.nonce, record);
  }

  /** Look one grant up by its nonce. */
  findByNonce(nonce: string): GrantRecord | null {
    return this.grants.get(nonce) ?? null;
  }

  /** Atomically consume a grant. Synchronous check-and-set in one block. */
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
    // WHY: GrantRecord is immutable (readonly consumedAtMs). Create a new record
    // with the updated consumedAtMs to preserve immutability.
    const consumedRecord: GrantRecord = {
      ...record,
      consumedAtMs: nowMs,
    };
    this.grants.set(nonce, consumedRecord);
    return { ok: true, consumedAtMs: nowMs };
  }

  /** Atomically revoke a grant. Synchronous check-and-set in one block. */
  async tryRevoke(nonce: string, nowMs: number): Promise<RevokeVerdict> {
    const record = this.grants.get(nonce);
    if (record === undefined) {
      return { ok: false, reason: "unknown_nonce" };
    }
    if (record.consumedAtMs !== null) {
      // WHY: mutually exclusive terminal states — a consumed grant cannot be revoked.
      return { ok: false, reason: "already_used" };
    }
    if (record.revokedAtMs !== null) {
      // WHY: idempotent — re-revoking returns success with the original timestamp.
      return { ok: true, revokedAtMs: record.revokedAtMs };
    }
    // WHY: GrantRecord is immutable (readonly revokedAtMs). Create a new record
    // with the updated revokedAtMs to preserve immutability.
    const revokedRecord: GrantRecord = {
      ...record,
      revokedAtMs: nowMs,
    };
    this.grants.set(nonce, revokedRecord);
    return { ok: true, revokedAtMs: nowMs };
  }

  /** Update grant status and decided fields (Task 9). */
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
    const updatedRecord: GrantRecord = {
      ...record,
      // Note: status field is not in GrantRecord yet; migration 04 has it in SQL
      // The in-memory record mirrors the columns we care about.
    };
    // The status is tracked via consumedAtMs and revokedAtMs in memory.
    // For approve/deny/expire we don't mutate those; they are metadata.
    // We add a helper field on the record in memory for tests.
    (updatedRecord as any).status = status;
    (updatedRecord as any).decidedAtMs = nowMs;
    (updatedRecord as any).decidedBy = decidedBy;
    this.grants.set(nonce, updatedRecord);
    return { ok: true, decidedAtMs: nowMs };
  }

  /** Edit a grant with new payload and policy decision fields (Task 9). */
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
    // A grant that is already consumed, revoked, or decided cannot be edited.
    if (record.consumedAtMs !== null || record.revokedAtMs !== null || (record as any).status) {
      return { ok: false, reason: "already_terminal" };
    }
    const editedRecord: GrantRecord = {
      ...record,
      payloadHash: newPayloadHash,
      preview: newPreview,
      cardHash: newCardHash,
      permissions: newPermissions,
      consequence: newConsequence,
      ruleId: newRuleId,
      expiresAtMs: newExpiresAtMs,
      // Status returns to pending on edit
    };
    // Clear any decided status
    delete (editedRecord as any).status;
    delete (editedRecord as any).decidedAtMs;
    delete (editedRecord as any).decidedBy;
    this.grants.set(nonce, editedRecord);
    return editedRecord;
  }
}