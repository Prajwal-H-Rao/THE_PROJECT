/** The policy decision endpoint. Returns allow, deny, or needs_approval. */

import { Injectable } from "@nestjs/common";
import { loadFamilies, findMatchingRule, FamilyDefinition } from "./policy-loader.js";
import {
  PolicyDecisionRequest,
  PolicyDecisionResponse,
  PolicyRule,
  Decision,
  validateDecisionRequest,
} from "./policy-schema.js";
import type { BulkDecisionRequest, BulkDecisionResponse } from "./policy-bulk-schema.js";
import { createHash } from "node:crypto";
import { getPolicyVersion } from "./policy-version.js";
import { decideBulk } from "./policy-bulk-decision.js";
import { authorize, AuthDecision, CallerContext, resetQuotaForTests } from "./authorization.js";

/** Chat approval policy result for the decision flow. */
interface ChatApprovalPolicy {
  readonly allowed: boolean;
  readonly reason: string;
}

/** Evaluate whether a rule permits chat approval for the given request.
 *  Returns { allowed: true } if chat approval is permitted for this rule.
 *  Returns { allowed: false, reason: "chat_approval_not_allowed" } for high-risk rules.
 *  Returns { allowed: false, reason: "chat_approval_requires_standard_flow" } for others. */
function evaluateChatApproval(rule: PolicyRule): ChatApprovalPolicy {
  // High-risk rules (tier3, tier4) never allow chat approval — refuse at policy boundary.
  if (rule.riskTier === "tier3" || rule.riskTier === "tier4") {
    return { allowed: false, reason: "chat_approval_not_allowed" };
  }
  // Rule explicitly allows chat approval: permit the chat-approval flow.
  if (rule.chatApprovalAllowed === true) {
    return { allowed: true, reason: "Chat approval allowed by policy rule" };
  }
  // Medium-risk rules without explicit chat approval: standard flow (no chat shortcut).
  return { allowed: false, reason: "chat_approval_requires_standard_flow" };
}

@Injectable()
export class PolicyDecisionService {
  private readonly config = loadFamilies();

  /** Make a policy decision for the given request with caller context.
   *
   * The caller context (service, scopes, userId, resourceOwnerId, grantNonce)
   * is derived by the controller from the verified service JWT — never from
   * the request body (spec:785). This method is the single gate for:
   * - identity_required (userId absent on user-plane rules)
   * - ownership_mismatch (resourceOwnerId != userId)
   * - quota_exceeded (per-user daily budget guard)
   * - no_matching_rule / invalid_request (existing)
   */
  decide(
    request: PolicyDecisionRequest,
    caller: CallerContext = { service: "unknown", scopes: [], userId: undefined, resourceOwnerId: undefined }
  ): PolicyDecisionResponse {
    // Layer 4 authorization gate (Module 04 Task 6)
    const auth = authorize(request, caller);
    if (!auth.allowed) {
      return {
        decision: "deny",
        ruleId: auth.denyCode ?? "authorization_failed",
        policyVersion: getPolicyVersion(),
        reason: auth.denyDetail ?? "Authorization failed",
      };
    }

    if (!validateDecisionRequest(request)) {
      return {
        decision: "deny",
        ruleId: "invalid_request",
        policyVersion: getPolicyVersion(),
        reason: "Invalid decision request format",
      };
    }

    const rule = findMatchingRule(this.config, request);

    if (!rule) {
      return {
        decision: "deny",
        ruleId: "no_matching_rule",
        policyVersion: getPolicyVersion(),
        reason: `No policy rule matches actor=${request.actor}, scope=${request.scope}, action=${request.action}, target=${request.target}`,
      };
    }

    // Deterministic decision based on the rule
    const decision = rule.defaultDecision;

    // Evaluate chat-approval policy (Task 10).
    // For high-risk rules (tier3/tier4), chat approval is never allowed regardless of payloadHash.
    // For other rules, chat approval requires a payloadHash.
    let chatApprovalAllowed: boolean | undefined;
    let chatApprovalReason: string | undefined;
    const isHighRisk = rule.riskTier === "tier3" || rule.riskTier === "tier4";
    if (isHighRisk) {
      chatApprovalAllowed = false;
      chatApprovalReason = "chat_approval_not_allowed";
    } else if (request.payloadHash) {
      const chatPolicy = evaluateChatApproval(rule);
      chatApprovalAllowed = chatPolicy.allowed;
      chatApprovalReason = chatPolicy.reason;
    }

    if (decision === "needs_approval" && request.payloadHash) {
      const nonce = createHash("sha256")
        .update(request.payloadHash + Date.now().toString())
        .digest("hex")
        .slice(0, 16);
      return {
        decision: "needs_approval",
        ruleId: rule.id,
        policyVersion: getPolicyVersion(),
        reason: `Action requires approval per rule ${rule.id}`,
        approvalRequired: {
          payloadHash: request.payloadHash,
          expirySeconds: 3600,
          nonce,
          requiresStepUp: rule.requiresStepUp ?? false,
        },
        chatApprovalAllowed,
        chatApprovalReason,
      };
    }

    return {
      decision,
      ruleId: rule.id,
      policyVersion: getPolicyVersion(),
      reason: decision === "allow" ? "Allowed by policy" : "Denied by policy",
      chatApprovalAllowed,
      chatApprovalReason,
    };
  }

  /** Make a bulk policy decision for multiple requests (Task 14). */
  decideBulk(request: BulkDecisionRequest, caller: CallerContext): BulkDecisionResponse {
    return decideBulk(request, this, this.config, caller);
  }

  /** Get all policy rules for inspection. */
  getAllRules(): readonly PolicyRule[] {
    return this.config.families.flatMap((f) => f.rules);
  }

  /** Get a specific rule by ID. */
  getRule(ruleId: string): PolicyRule | undefined {
    for (const family of this.config.families) {
      const rule = family.rules.find((r) => r.id === ruleId);
      if (rule) {
        return rule;
      }
    }
    return undefined;
  }

  /** Get all families. */
  getFamilies(): readonly FamilyDefinition[] {
    return this.config.families;
  }

  /** Validate that every family has at least one rule. */
  validateFamilies(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    for (const family of this.config.families) {
      if (!family.rules || family.rules.length === 0) {
        errors.push(`Family ${family.name} has no rules`);
      }
    }
    return { valid: errors.length === 0, errors };
  }
}