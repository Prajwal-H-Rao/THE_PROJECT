/** The approval card helpers: consequence mapping, permissions derivation,
 *  preview size bound, card hash computation, and grant card formatting. */

import { computeApprovalHash } from "@nova/contracts/approval-hash";
import type { GrantRecord } from "./grant-binding.js";

/** Maximum preview size in bytes (10KB). */
export const MAX_PREVIEW_BYTES = 10 * 1024;

/** Consequence mapping: riskTier + sensitivity → human-readable risk description. */
export const CONSEQUENCE_MAP: Record<string, Record<string, string>> = {
  tier1: {
    low: "Low risk: read-only action",
    medium: "Medium risk: may modify own data",
    high: "High risk: may modify team data",
    critical: "Critical risk: may affect organization data",
  },
  tier2: {
    low: "Low risk: creates resources",
    medium: "Medium risk: modifies shared resources",
    high: "High risk: may affect organization data",
    critical: "Critical risk: irreversible operation",
  },
  tier3: {
    low: "Low risk: external read",
    medium: "Medium risk: external write",
    high: "High risk: external admin",
    critical: "Critical risk: irreversible external operation",
  },
  tier4: {
    low: "Critical risk: irreversible operation",
    medium: "Critical risk: irreversible operation",
    high: "Critical risk: irreversible operation",
    critical: "Critical risk: irreversible operation",
  },
};

/** Derive consequence string from riskTier and sensitivity. */
export function deriveConsequence(riskTier: string, sensitivity: string): string {
  return CONSEQUENCE_MAP[riskTier]?.[sensitivity] ?? "Risk: policy evaluation required";
}

/** Derive permissions array from rule.allowedActions with fallback. */
export function derivePermissions(allowedActions: readonly string[] | undefined, action: string): readonly string[] {
  return allowedActions?.length ? allowedActions : [action];
}

/** Compute card hash from preview, or return undefined if no preview. */
export function computeCardHash(preview: unknown | undefined): string | undefined {
  if (preview === undefined) return undefined;
  return computeApprovalHash(preview);
}

/** Validate preview size and return the preview and its card hash. */
export function validateAndHashPreview(preview: unknown | undefined): {
  preview: unknown | undefined;
  cardHash: string | undefined;
} {
  if (preview === undefined) {
    return { preview: undefined, cardHash: undefined };
  }
  const previewBytes = Buffer.byteLength(JSON.stringify(preview), "utf8");
  if (previewBytes > MAX_PREVIEW_BYTES) {
    throw new Error(`preview exceeds ${MAX_PREVIEW_BYTES} byte limit`);
  }
  return { preview, cardHash: computeApprovalHash(preview) };
}

/** Format a grant record as a card for display. Returns null if no preview or service mismatch. */
export function formatGrantCard(
  record: GrantRecord,
  requestingService: string
): {
  target: string;
  preview: unknown;
  permissions: readonly string[];
  consequence: string;
  expiresAtMs: number;
  cardHash: string;
} | null {
  if (record.service !== requestingService) {
    return null;
  }
  if (record.preview === undefined) {
    return null;
  }
  return {
    target: record.target,
    preview: record.preview,
    permissions: record.permissions ?? [],
    consequence: record.consequence ?? "",
    expiresAtMs: record.expiresAtMs,
    cardHash: record.cardHash ?? "",
  };
}