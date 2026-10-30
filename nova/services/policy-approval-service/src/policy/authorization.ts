/** Layer 4 authorization gate for policy decisions (Module 04 Task 6).
 *
 * Checks run inside decide() with a caller context derived from a verified
 * service JWT. No body-carried identity is trusted (spec:785).
 * - Rules with actor "user" require verified userId; absent -> identity_required.
 * - resourceOwnerId present and != userId -> ownership_mismatch (mandatory).
 * - Per-user daily quota -> quota_exceeded (budget guard, reset on restart under-counts).
 * - Admin endpoints (rules, version/bump) require admin scope — enforced at controller.
 * - Fail closed on any gate exception.
 */

import { getUsageCounter } from "./usage-counter.js";
import { loadFamilies, findMatchingRule } from "./policy-loader.js";
import { PolicyRule } from "./policy-schema.js";

export interface CallerContext {
  readonly service: string;
  readonly scopes: readonly string[];
  readonly userId?: string;         // verified user id from service plane, never chat
  readonly resourceOwnerId?: string; // concrete target owner when provided
  readonly grantNonce?: string;      // optional grant reference by nonce
}

export interface AuthDecision {
  readonly allowed: boolean;
  readonly denyCode?: string;
  readonly denyDetail?: string;
}

const ADMIN_REQUIRED_SCOPE = "policy:admin";

function fail(code: string, detail: string): AuthDecision {
  return { allowed: false, denyCode: code, denyDetail: detail };
}

export function authorize(
  request: {
    actor: string;
    scope: string;
    action: string;
    target: string;
    sensitivity?: string;
    payloadHash?: string;
    userId?: string;
    resourceOwnerId?: string;
    grantNonce?: string;
  },
  caller: CallerContext
): AuthDecision {
  // 1. Rule-driven identity requirement for ALL user-plane rules.
  const config = loadFamilies();
  const rule = findMatchingRule(config, request);
  if (!rule) {
    return fail("no_matching_rule", "No policy rule matches the request");
  }

  // Any rule with actor === "user" requires a verified userId from the service plane.
  if (rule.actor === "user") {
    if (!caller.userId) {
      return fail("identity_required", "Verified user identity required for user-plane actions");
    }
    // Ownership check: if a concrete target owner is provided and differs -> deny.
    if (caller.resourceOwnerId && caller.resourceOwnerId !== caller.userId) {
      return fail("ownership_mismatch", "Cross-user access denied");
    }
    // Per-user daily quota (budget guard, not a Layer-4 security property)
    const [allowed, remaining] = getUsageCounter().checkAndIncrement(caller.userId);
    if (!allowed) {
      return fail("quota_exceeded", `Daily action limit exceeded`);
    }
  }

  // 2. Admin scope gate: rules and version/bump endpoints require admin scope.
  // This is enforced at the controller; the gate is documented here.

  return { allowed: true };
}

/** Test helper to reset quota counter between tests. */
export function resetQuotaForTests(userId?: string): void {
  getUsageCounter().reset(userId);
}