/** The policy rule schema. Defines how policy rules are structured. */

export type Sensitivity = "low" | "medium" | "high" | "critical";

export type BlastRadius = "self" | "team" | "organization" | "external";

export type RiskTier = "tier1" | "tier2" | "tier3" | "tier4";

export type Decision = "allow" | "deny" | "needs_approval";

export interface PolicyRule {
  readonly id: string;
  readonly actor: string;
  readonly scope: string;
  readonly sensitivity: Sensitivity;
  readonly target: string;
  readonly blastRadius: BlastRadius;
  readonly riskTier: RiskTier;
  readonly defaultDecision: Decision;
  readonly requiresStepUp?: boolean;
  readonly allowedActions?: readonly string[];
  readonly version: number;
}

export interface PolicyDecisionRequest {
  readonly actor: string;
  readonly scope: string;
  readonly action: string;
  readonly target: string;
  readonly sensitivity?: Sensitivity;
  readonly payloadHash?: string;
}

export interface PolicyDecisionResponse {
  readonly decision: Decision;
  readonly ruleId: string;
  readonly policyVersion: number;
  readonly reason?: string;
  readonly approvalRequired?: {
    readonly payloadHash: string;
    readonly expirySeconds: number;
    readonly nonce: string;
    readonly requiresStepUp?: boolean;
  };
}

/** Validate that a policy rule has all required fields and no unknown fields. */
export function validatePolicyRule(rule: unknown): rule is PolicyRule {
  if (typeof rule !== "object" || rule === null) {
    return false;
  }
  const r = rule as Record<string, unknown>;
  const required = [
    "id",
    "actor",
    "scope",
    "sensitivity",
    "target",
    "blastRadius",
    "riskTier",
    "defaultDecision",
    "version",
  ];
  for (const field of required) {
    if (!(field in r)) {
      return false;
    }
  }
  if (!["low", "medium", "high", "critical"].includes(r.sensitivity as string)) {
    return false;
  }
  if (!["self", "team", "organization", "external"].includes(r.blastRadius as string)) {
    return false;
  }
  if (!["tier1", "tier2", "tier3", "tier4"].includes(r.riskTier as string)) {
    return false;
  }
  if (!["allow", "deny", "needs_approval"].includes(r.defaultDecision as string)) {
    return false;
  }
  if (typeof r.version !== "number" || !Number.isInteger(r.version)) {
    return false;
  }
  const allowedKeys = new Set([
    "id",
    "actor",
    "scope",
    "sensitivity",
    "target",
    "blastRadius",
    "riskTier",
    "defaultDecision",
    "requiresStepUp",
    "allowedActions",
    "version",
  ]);
  for (const key of Object.keys(r)) {
    if (!allowedKeys.has(key)) {
      return false;
    }
  }
  return true;
}

/** Validate that a decision request has all required fields. */
export function validateDecisionRequest(req: unknown): req is PolicyDecisionRequest {
  if (typeof req !== "object" || req === null) {
    return false;
  }
  const r = req as Record<string, unknown>;
  const required = ["actor", "scope", "action", "target"];
  for (const field of required) {
    if (!(field in r) || typeof r[field] !== "string") {
      return false;
    }
  }
  if (
    "sensitivity" in r &&
    typeof r.sensitivity === "string" &&
    !["low", "medium", "high", "critical"].includes(r.sensitivity)
  ) {
    return false;
  }
  if (
    "payloadHash" in r &&
    r.payloadHash !== undefined &&
    typeof r.payloadHash !== "string"
  ) {
    return false;
  }
  return true;
}