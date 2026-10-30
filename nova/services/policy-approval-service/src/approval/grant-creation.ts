/** Grant creation handlers. Implements the Task 4 and Task 8 grant
 *  creation logic with payload hash binding, catalogue action validation,
 *  and optional card preview.
 */

import { randomBytes } from "node:crypto";
import type { GrantRecord } from "./grant-binding.js";
import type { GrantRepository } from "./grant-repository-types.js";
import { GrantValidationError } from "./grants.service.js";
import { getPolicyVersion } from "../policy/policy-version.js";
import { loadCatalogue } from "@nova/contracts/mcp/server";
import type { ToolCatalogue } from "@nova/contracts/mcp/server";
import {
  validateCreateGrantInput,
  generatePayloadHash,
  createBaseGrantRecord,
} from "./grant-validation.js";
import { MAX_PREVIEW_BYTES, validateAndHashPreview } from "./grant-card.js";

/** Load the tool catalogue once at module load (fails gracefully if missing). */
const CATALOGUE_PROMISE: Promise<ToolCatalogue> = loadCatalogue(
  "/home/prajwal/THE_PROJECT/nova/packages/contracts/mcp/catalogue"
);

async function getCatalogue(): Promise<ToolCatalogue> {
  return CATALOGUE_PROMISE;
}

/** Input for basic grant creation (Task 4). */
export interface CreateGrantInput {
  readonly userId: string;
  readonly service: string;
  /** Full catalogue operation_id (e.g., "inbox.send"). Must match an enumerated operation. */
  readonly action: string;
  readonly target: string;
  readonly payload: unknown;
  readonly ttlSeconds: number;
  readonly policyVersion?: string | number;
  readonly nowMs?: number;
}

/** Extended input for grant creation with approval card details (Task 8). */
export interface CreateGrantWithDetailsInput extends CreateGrantInput {
  readonly preview?: unknown;
  readonly permissions?: readonly string[];
  readonly consequence?: string;
  readonly ruleId?: string;
}

/** Create one grant bound to payload hash, user, target, expiry and nonce.
 *  Validates action against the MCP catalogue. */
export async function createGrant(
  repository: GrantRepository,
  input: CreateGrantInput
): Promise<GrantRecord> {
  const catalogue = await getCatalogue();
  validateCreateGrantInput(input, catalogue);
  const payloadHash = generatePayloadHash(input.payload);
  const record = createBaseGrantRecord({
    ...input,
    policyVersion: input.policyVersion ?? getPolicyVersion(),
    payloadHash,
  });
  repository.save(record);
  return record;
}

/** Create a grant with approval card details (Task 8). */
export async function createGrantWithDetails(
  repository: GrantRepository,
  input: CreateGrantWithDetailsInput
): Promise<GrantRecord> {
  const catalogue = await getCatalogue();
  validateCreateGrantInput(input, catalogue);
  const payloadHash = generatePayloadHash(input.payload);
  const baseRecord = createBaseGrantRecord({
    ...input,
    policyVersion: input.policyVersion ?? getPolicyVersion(),
    payloadHash,
  });

  // WHY: preview is the exact object shown to user. Enforce size limit.
  let preview: unknown | undefined;
  let cardHash: string | undefined;
  if (input.preview !== undefined) {
    try {
      const { preview: validatedPreview, cardHash: validatedCardHash } = validateAndHashPreview(input.preview);
      preview = validatedPreview;
      cardHash = validatedCardHash;
    } catch (error) {
      if (error instanceof Error) {
        throw new GrantValidationError("preview_too_large", error.message);
      }
      throw error;
    }
  }

  const record: GrantRecord = {
    ...baseRecord,
    grantId: randomBytes(16).toString("hex"),
    preview,
    cardHash,
    permissions: input.permissions,
    consequence: input.consequence,
    ruleId: input.ruleId,
  };
  repository.save(record);
  return record;
}