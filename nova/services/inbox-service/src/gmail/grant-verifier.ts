/**
 * GrantVerifier interface for approval grant verification.
 * Domain services use this to verify a grant before executing a write action.
 * Real implementation wraps GrantVerificationClient from contracts.
 */

import type { GrantVerifyResult, VerifyGrantOptions } from "@nova/contracts/grant-verification-types";

export interface GrantVerifier {
  verifyGrant(nonce: string, options: VerifyGrantOptions): Promise<GrantVerifyResult>;
}

export class GrantVerificationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "GrantVerificationError";
  }
}

export class GrantNotFoundError extends GrantVerificationError {
  constructor(nonce: string) {
    super("grant_not_found", `Grant not found: ${nonce}`);
  }
}

export class GrantDeniedError extends GrantVerificationError {
  constructor(reason: string) {
    super("grant_denied", `Grant denied: ${reason}`);
  }
}

export interface MockGrantVerifier extends GrantVerifier {
  grants: Map<string, { ok: boolean; reason?: string }>;
  setGrant(nonce: string, result: { ok: boolean; reason?: string }): void;
  clearGrants(): void;
}

export function createMockGrantVerifier(): MockGrantVerifier {
  const grants: Map<string, { ok: boolean; reason?: string }> = new Map();

  const verifier: MockGrantVerifier = {
    async verifyGrant(nonce, options) {
      const result = grants.get(nonce);
      if (!result) {
        return { ok: false, reason: "unknown_nonce" } as GrantVerifyResult;
      }
      return result as GrantVerifyResult;
    },
    grants,
    setGrant(nonce, result) {
      grants.set(nonce, result);
    },
    clearGrants() {
      grants.clear();
    },
  };

  return verifier;
}
