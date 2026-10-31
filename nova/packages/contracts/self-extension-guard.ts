/** Self-Extension Guard for Layer 9.
 * 
 * Prevents an entity from modifying its own configuration, policies,
 * grants, or authorization. Used across services to enforce
 * "no agent self-extension" (spec:207).
 */

export interface SelfExtensionContext {
  /** The identity attempting the operation (e.g., service ID, user ID) */
  actor: string;
  /** The target resource being modified (user ID, grant nonce, etc.) */
  target: string;
  /** The type of operation being attempted */
  operation: "grant_role" | "revoke_role" | "approve_grant" | "reject_grant" | "expire_grant" | "edit_grant" | "bump_policy_version" | "modify_policy" | "modify_model_config" | "modify_infrastructure";
}

/**
 * Checks if an operation constitutes self-extension.
 * Returns an error message if self-extension is detected, null otherwise.
 */
export function checkSelfExtension(ctx: SelfExtensionContext): string | null {
  // For role operations, check if actor is trying to modify their own roles
  if (ctx.operation === "grant_role" || ctx.operation === "revoke_role") {
    if (ctx.actor === ctx.target) {
      return "Self-extension prohibited: cannot modify own roles";
    }
  }

  // For grant operations, check if actor is the grant owner
  if (
    ctx.operation === "approve_grant" ||
    ctx.operation === "reject_grant" ||
    ctx.operation === "expire_grant" ||
    ctx.operation === "edit_grant"
  ) {
    if (ctx.actor === ctx.target) {
      return "Self-extension prohibited: cannot modify own grants";
    }
  }

  // For policy version bump
  if (ctx.operation === "bump_policy_version") {
    // Policy version bump is always a self-extension when called by the policy service itself
    return "Policy version bump is prohibited at runtime (self-extension prohibited)";
  }

  // For policy modifications
  if (ctx.operation === "modify_policy") {
    return "Policy modifications are prohibited at runtime (self-extension prohibited)";
  }

  // For model config modifications
  if (ctx.operation === "modify_model_config") {
    return "Model configuration modifications are prohibited at runtime (self-extension prohibited)";
  }

  // For infrastructure modifications
  if (ctx.operation === "modify_infrastructure") {
    return "Infrastructure modifications are prohibited at runtime (self-extension prohibited)";
  }

  return null;
}

/**
 * Middleware helper: throws if self-extension is detected.
 */
export function assertNoSelfExtension(ctx: SelfExtensionContext): void {
  const error = checkSelfExtension(ctx);
  if (error) {
    throw new Error(error);
  }
}