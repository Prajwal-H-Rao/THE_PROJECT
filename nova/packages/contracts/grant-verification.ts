/** Grant Verification Helper — client library for domain services.
 * 
 * Domain services (inbox, calendar, jobs) use this helper to:
 * - Verify a grant before executing an action
 * - Consume a grant after successful execution
 * - Fetch grant card for display
 * 
 * This helper wraps the policy-approval-service HTTP endpoints.
 * It does NOT contain business logic — only HTTP communication.
 */

import { computeApprovalHash, canonicalPayload } from "./approval-hash.js";

/** Configuration for the grant verification client. */
export interface GrantVerificationConfig {
  /** Base URL of the policy-approval-service (e.g., "http://policy-approval-service:3000"). */
  baseUrl: string;
  /** Service name making the request (used for service validation on card endpoint). */
  serviceName: string;
  /** Optional fetch implementation (defaults to global fetch). */
  fetch?: typeof fetch;
}

/** Result of verifying a grant. */
export interface GrantVerifyResult {
  ok: boolean;
  reason?: "payload_hash_mismatch" | "user_mismatch" | "service_mismatch" 
    | "target_mismatch" | "expired" | "revoked" | "policy_version_mismatch"
    | "invalid_user" | "unknown_nonce";
}

/** Result of consuming a grant. */
export interface GrantConsumeResult {
  ok: boolean;
  consumedAtMs?: number;
  reason?: "already_used" | "unknown_nonce" | "already_revoked" | "invalid_nonce";
}

/** Grant card data for display. */
export interface GrantCard {
  target: string;
  preview: unknown;
  permissions: readonly string[];
  consequence: string;
  expiresAtMs: number;
  cardHash: string;
}

/** Options for verifying a grant. */
export interface VerifyGrantOptions {
  /** The user ID the grant was issued to. */
  userId: string;
  /** The target of the action (e.g., "message:draft-1"). */
  target: string;
  /** The exact payload that was approved (must match the preview used to create the grant). */
  payload: unknown;
  /** The policy version at the time of grant creation. */
  policyVersion: string | number;
}

/** Options for consuming a grant. */
export interface ConsumeGrantOptions {
  /** The grant nonce (32-char hex from the grant creation response). */
  nonce: string;
}

/** Options for fetching a grant card. */
export interface GetGrantCardOptions {
  /** The grant nonce (32-char hex from the grant creation response). */
  nonce: string;
}

/** Error thrown by the grant verification client. */
export class GrantVerificationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "GrantVerificationError";
  }
}

/**
 * Client for verifying and consuming approval grants.
 * Domain services use this to enforce approval policies.
 */
export class GrantVerificationClient {
  private readonly baseUrl: string;
  private readonly serviceName: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: GrantVerificationConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.serviceName = config.serviceName;
    this.fetchImpl = config.fetch ?? globalThis.fetch;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchImpl(url, {
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
      ...init,
    });

    if (!response.ok) {
      let errorData: { error?: string; message?: string } = {};
      try {
        errorData = await response.json();
      } catch {
        // ignore parse errors
      }
      throw new GrantVerificationError(
        errorData.error ?? "request_failed",
        errorData.message ?? `HTTP ${response.status}`,
        response.status
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }
    return response.json();
  }

  /**
   * Verify that a grant is valid for the given action.
   * Call this BEFORE executing the action.
   * 
   * @param nonce - The grant nonce (32-char hex)
   * @param options - Verification parameters
   * @returns Verification result
   */
  async verifyGrant(nonce: string, options: VerifyGrantOptions): Promise<GrantVerifyResult> {
    const payloadHash = computeApprovalHash(options.payload);
    return this.request<GrantVerifyResult>(`/policy/grants/${nonce}/verify`, {
      method: "POST",
      body: JSON.stringify({
        userId: options.userId,
        service: this.serviceName,
        target: options.target,
        payload: options.payload,
        policyVersion: options.policyVersion,
      }),
    });
  }

  /**
   * Consume a grant after successful execution.
   * Call this AFTER the action has completed successfully.
   * 
   * @param nonce - The grant nonce (32-char hex)
   * @returns Consumption result
   */
  async consumeGrant(nonce: string): Promise<GrantConsumeResult> {
    return this.request<GrantConsumeResult>(`/policy/grants/${nonce}/consume`, {
      method: "POST",
    });
  }

  /**
   * Execute the full verify-then-consume flow atomically.
   * Use this for simple cases where you want to verify and consume in one call.
   * 
   * Note: This is NOT atomic on the server — the server still processes
   * verify and consume as separate steps. For true atomicity, use the
   * server-side consume endpoint which does the check-and-consume in one step.
   * This client method is provided for convenience.
   * 
   * @param nonce - The grant nonce
   * @param options - Verification parameters
   * @returns Consumption result (includes verification failure info if applicable)
   */
  async verifyAndConsume(nonce: string, options: VerifyGrantOptions): Promise<GrantConsumeResult & { verifyReason?: string }> {
    const verifyResult = await this.verifyGrant(nonce, options);
    if (!verifyResult.ok) {
      // Map verify reasons to consume-compatible reasons, default to "unknown_nonce"
      const mappedReason = verifyResult.reason === "unknown_nonce" ? "unknown_nonce" : "already_used";
      return { ok: false, reason: mappedReason, verifyReason: verifyResult.reason };
    }
    return this.consumeGrant(nonce);
  }

  /**
   * Fetch the grant card for display to the user.
   * 
   * @param nonce - The grant nonce (32-char hex)
   * @returns Grant card data, or null if not found/no preview/service mismatch
   */
  async getGrantCard(nonce: string): Promise<GrantCard | null> {
    try {
      return await this.request<GrantCard>(`/policy/grants/${nonce}/card?service=${encodeURIComponent(this.serviceName)}`);
    } catch (error) {
      if (error instanceof GrantVerificationError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Verify that a locally displayed preview matches the grant's card hash.
   * Call this on the client side after rendering the preview to ensure
   * the preview hasn't been tampered with.
   * 
   * @param displayedPreview - The preview object as displayed to the user
   * @param cardHash - The cardHash from the grant card
   * @returns true if the preview matches the hash
   */
  static verifyPreviewHash(displayedPreview: unknown, cardHash: string): boolean {
    return computeApprovalHash(displayedPreview) === cardHash;
  }
}

/**
 * Create a grant verification client with default configuration.
 * Reads base URL from environment variable POLICY_APPROVAL_SERVICE_URL
 * and service name from SERVICE_NAME.
 */
export function createGrantVerificationClient(overrides?: Partial<GrantVerificationConfig>): GrantVerificationClient {
  const baseUrl = process.env.POLICY_APPROVAL_SERVICE_URL ?? "http://localhost:3000";
  const serviceName = process.env.SERVICE_NAME ?? "unknown-service";
  return new GrantVerificationClient({ baseUrl, serviceName, ...overrides });
}

export { computeApprovalHash, canonicalPayload } from "./approval-hash.js";