/** Shared grant validation logic (Module 04 Task 7).
 *  Extracted from grant-creation.ts to avoid duplication and keep files < 200 lines.
 */

import { randomBytes } from "node:crypto";
import type { GrantRecord } from "./grant-binding.js";
import { hashObjectPayload, isUuid } from "./grant-binding.js";
import { computeApprovalHash } from "@nova/contracts/approval-hash";
import type { GrantRepository } from "./grant-repository-types.js";
import { GrantValidationError } from "./grants.service.js";
import { loadCatalogue } from "@nova/contracts/mcp/server";
import type { ToolCatalogue } from "@nova/contracts/mcp/server";

const NONCE_BYTES = 16;

/** Free-text strings that are not valid approval payloads. */
const FREE_TEXT_PATTERNS = [
  /^yes$/i, /^approve$/i, /^ok$/i, /^okay$/i, /^confirm$/i, /^agree$/i,
  /^allow$/i, /^sure$/i, /^y$/i, /^yep$/i, /^yeah$/i,
];

/** Check if a payload is free-form text that should not be treated as approval. */
function isFreeText(payload: unknown): boolean {
  if (typeof payload !== "string") return false;
  return FREE_TEXT_PATTERNS.some((pattern) => pattern.test(payload.trim()));
}

/** Validate that payload is a proper object, not free-form text. */
function validatePayload(payload: unknown): void {
  if (isFreeText(payload)) {
    throw new GrantValidationError("free_text_not_allowed", "Free-text approval is not allowed; payload must be a bound action object");
  }
  if (typeof payload === "string") {
    throw new GrantValidationError("free_text_not_allowed", "String payload is not allowed; payload must be a bound action object");
  }
  if (payload === null || payload === undefined) {
    throw new GrantValidationError("free_text_not_allowed", "Payload is required; payload must be a bound action object");
  }
  if (Array.isArray(payload)) {
    throw new GrantValidationError("free_text_not_allowed", "Array payload is not allowed; payload must be a bound action object");
  }
  if (typeof payload !== "object") {
    throw new GrantValidationError("free_text_not_allowed", "Payload must be an object; payload must be a bound action object");
  }
}

/** Validate base grant input fields (shared by createGrant and createGrantWithDetails). */
export function validateCreateGrantInput(input: {
  readonly userId: string;
  readonly service: string;
  readonly action: string;
  readonly target: string;
  readonly payload: unknown;
  readonly ttlSeconds: number;
  readonly policyVersion?: string | number;
}, catalogue?: ToolCatalogue): void {
  validatePayload(input.payload);
  if (!isUuid(input.userId)) {
    throw new GrantValidationError("invalid_user", "userId must be a UUID");
  }
  if (!Number.isFinite(input.ttlSeconds) || input.ttlSeconds <= 0) {
    throw new GrantValidationError("invalid_ttl", "ttlSeconds must be a positive finite number");
  }
  if (typeof input.service !== "string" || input.service === "" ||
      typeof input.action !== "string" || input.action === "" ||
      typeof input.target !== "string" || input.target === "") {
    throw new GrantValidationError("invalid_fields", "service, action and target must be non-empty strings");
  }
  // Validate action against catalogue if provided
  if (catalogue && !catalogue.tools.has(input.action)) {
    throw new GrantValidationError("invalid_action", `Action '${input.action}' is not an enumerated catalogue operation`);
  }
}

/** Generate a payload hash for the grant. */
export function generatePayloadHash(payload: unknown): string {
  try {
    return computeApprovalHash(payload);
  } catch {
    throw new GrantValidationError("invalid_payload", "payload must be JSON-representable");
  }
}

/** Generate the base grant record fields. */
export function createBaseGrantRecord(input: {
  readonly userId: string;
  readonly service: string;
  readonly action: string;
  readonly target: string;
  readonly payloadHash: string;
  readonly policyVersion: string | number;
  readonly ttlSeconds: number;
  readonly nowMs?: number;
}): GrantRecord {
  const nowMs = input.nowMs ?? Date.now();
  return {
    grantId: randomBytes(16).toString("hex"),
    userId: input.userId,
    service: input.service,
    action: input.action,
    target: input.target,
    payloadHash: input.payloadHash,
    policyVersion: String(input.policyVersion),
    nonce: randomBytes(NONCE_BYTES).toString("hex"),
    createdAtMs: nowMs,
    expiresAtMs: nowMs + input.ttlSeconds * 1000,
    consumedAtMs: null,
    revokedAtMs: null,
  };
}