/** The grants service. Creates grant records and verifies verification
 * attempts against the binding. Storage is an in-memory repository because
 * Postgres is unavailable here; the SQL swap later keeps this interface. */

import { randomBytes, randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import {
  GrantRecord, GrantVerdict, GrantVerifyAttempt, hashObjectPayload, isUuid, verifyBinding
} from "./grant-binding.js";

/** The storage contract. Keyed by nonce: the unique grant key. */
export interface GrantRepository {
  save(record: GrantRecord): void;
  findByNonce(nonce: string): GrantRecord | null;
  /** Atomically consume a grant. Returns consume verdict. */
  tryConsume(nonce: string, nowMs: number): Promise<ConsumeVerdict>;
  /** Atomically revoke a grant. Returns revoke verdict. */
  tryRevoke(nonce: string, nowMs: number): Promise<RevokeVerdict>;
}

/** Result of a consume attempt. */
export type ConsumeVerdict =
  | { readonly ok: true; readonly consumedAtMs: number }
  | { readonly ok: false; readonly reason: "already_used" | "unknown_nonce" | "already_revoked" };

/** Result of a revoke attempt. */
export type RevokeVerdict =
  | { readonly ok: true; readonly revokedAtMs: number }
  | { readonly ok: false; readonly reason: "unknown_nonce" | "already_used" };

/** In-memory repository. Declared stub; see the design note. */
@Injectable()
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
}

/** The input for grant creation. */
export interface CreateGrantInput {
  readonly userId: string;
  readonly service: string;
  readonly action: string;
  readonly target: string;
  readonly payload: unknown;
  readonly ttlSeconds: number;
  readonly policyVersion?: string | number;
  readonly nowMs?: number;
}

// WHY: the grants nonce is the unique grant key. randomBytes, never derived
// from a timestamp, so two grants cannot collide and cannot be guessed.
const NONCE_BYTES = 16;
const DEFAULT_POLICY_VERSION = "1";

/** Error for rejected creation input. The controller maps it to HTTP 400. */
export class GrantValidationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

@Injectable()
export class GrantsService {
  constructor(private readonly repository: GrantRepository) {}

  /** Create one grant bound to payload hash, user, target, expiry and nonce. */
  createGrant(input: CreateGrantInput): GrantRecord {
    if (!isUuid(input.userId)) {
      throw new GrantValidationError("invalid_user", "userId must be a UUID");
    }
    // WHY: a non-plain payload (Date, cyclic) would throw inside the hash
    // helper; surface that as a validation failure, not a 500.
    const payloadHash = (() => {
      try {
        return hashObjectPayload(input.payload);
      } catch {
        throw new GrantValidationError("invalid_payload", "payload must be JSON-representable");
      }
    })();
    if (!Number.isFinite(input.ttlSeconds) || input.ttlSeconds <= 0) {
      throw new GrantValidationError("invalid_ttl", "ttlSeconds must be a positive finite number");
    }
    if (typeof input.service !== "string" || input.service === "" || typeof input.action !== "string" || input.action === "" || typeof input.target !== "string" || input.target === "") {
      throw new GrantValidationError("invalid_fields", "service, action and target must be non-empty strings");
    }
    const nowMs = input.nowMs ?? Date.now();
    const record: GrantRecord = {
      grantId: randomUUID(),
      userId: input.userId,
      service: input.service,
      action: input.action,
      target: input.target,
      payloadHash,
      policyVersion: String(input.policyVersion ?? DEFAULT_POLICY_VERSION),
      nonce: randomBytes(NONCE_BYTES).toString("hex"),
      createdAtMs: nowMs,
      expiresAtMs: nowMs + input.ttlSeconds * 1000,
      consumedAtMs: null,
      revokedAtMs: null,
    };
    this.repository.save(record);
    return record;
  }

  /** Verify one attempt against the stored grant. */
  verifyGrant(nonce: string, attempt: GrantVerifyAttempt): GrantVerdict {
    const record = this.repository.findByNonce(nonce);
    if (record === null) {
      return { ok: false, reason: "unknown_nonce" };
    }
    return verifyBinding(record, attempt);
  }

  /** Consume a grant once. Validates nonce format then delegates to repo. */
  async consumeGrant(nonce: string): Promise<ConsumeVerdict> {
    if (!/^[0-9a-f]{32}$/i.test(nonce)) {
      throw new GrantValidationError("invalid_nonce", "nonce must be a 32-char hex string");
    }
    return this.repository.tryConsume(nonce, Date.now());
  }

  /** Revoke a grant. Validates nonce format then delegates to repo. */
  async revokeGrant(nonce: string): Promise<RevokeVerdict> {
    if (!/^[0-9a-f]{32}$/i.test(nonce)) {
      throw new GrantValidationError("invalid_nonce", "nonce must be a 32-char hex string");
    }
    return this.repository.tryRevoke(nonce, Date.now());
  }
}