/** The policy decision endpoint. Returns allow, deny, or needs_approval. */

import { Injectable } from "@nestjs/common";
import { loadFamilies, findMatchingRule, FamilyDefinition } from "./policy-loader.js";
import {
  PolicyDecisionRequest,
  PolicyDecisionResponse,
  PolicyRule,
  Decision,
  validateDecisionRequest,
  BulkDecisionRequest,
  BulkDecisionResponse,
  BulkDecisionItemResult,
  validateBulkDecisionRequest,
} from "./policy-schema.js";
import { createHash } from "node:crypto";
import { getPolicyVersion } from "./policy-version.js";

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

/** Check if an action is an escalation (adds new source or submits application).
 *  WHY: Task 14 - bulk actions cannot silently enable new sources or submit applications. */
function isEscalationAction(rule: PolicyRule): boolean {
  // Escalation actions: tier3/tier4, requiresStepUp, or needs_approval for external/target actions
  if (rule.riskTier === "tier3" || rule.riskTier === "tier4") {
    return true;
  }
  if (rule.requiresStepUp === true) {
    return true;
  }
  // Actions that submit applications or add sources are escalations
  // Check rule ID for escalation patterns
  const escalationPatterns = [
    /\.apply$/i,
    /\.submit$/i,
    /\.import$/i,
    /\.link$/i,
    /\.connect$/i,
    /\.add.*source$/i,
    /\.create.*source$/i,
    /\.register.*source$/i,
  ];
  return escalationPatterns.some((pattern) => pattern.test(rule.id));
}

@Injectable()
export class PolicyDecisionService {
  private readonly config = loadFamilies();

  /** Make a policy decision for the given request. */
  decide(request: PolicyDecisionRequest): PolicyDecisionResponse {
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
      // High-risk rules never allow chat approval
      chatApprovalAllowed = false;
      chatApprovalReason = "chat_approval_not_allowed";
    } else if (request.payloadHash) {
      const chatPolicy = evaluateChatApproval(rule);
      chatApprovalAllowed = chatPolicy.allowed;
      chatApprovalReason = chatPolicy.reason;
    }

    if (decision === "needs_approval" && request.payloadHash) {
      // Generate approval requirements bound to the payload hash
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

  /** Make a bulk policy decision for multiple requests (Task 14).
   *  Returns allow only if all items are allow.
   *  Returns deny if any item is deny.
   *  Returns needs_approval if any item needs approval.
   *  Fails the entire batch if any item is an escalation action. */
  decideBulk(request: BulkDecisionRequest): BulkDecisionResponse {
    if (!validateBulkDecisionRequest(request)) {
      return {
        decision: "deny",
        policyVersion: getPolicyVersion(),
        reason: "Invalid bulk decision request format",
        items: [],
        hasEscalation: false,
      };
    }

    const itemResults: BulkDecisionItemResult[] = [];
    let hasDeny = false;
    let hasNeedsApproval = false;
    let hasEscalation = false;

    for (let i = 0; i < request.items.length; i++) {
      const item = request.items[i] as PolicyDecisionRequest;
      const decision = this.decide(item);

      // Check for escalation
      const rule = findMatchingRule(this.config, item);
      const isEscalation = rule ? isEscalationAction(rule) : false;
      if (isEscalation) {
        hasEscalation = true;
      }

      // Build item result
      const itemResult: BulkDecisionItemResult = {
        index: i,
        decision: decision.decision,
        ruleId: decision.ruleId,
        reason: decision.reason,
        approvalRequired: decision.approvalRequired,
        chatApprovalAllowed: decision.chatApprovalAllowed,
        chatApprovalReason: decision.chatApprovalReason,
      };
      itemResults.push(itemResult);

      // Track overall batch decision
      if (decision.decision === "deny") {
        hasDeny = true;
      }
      if (decision.decision === "needs_approval") {
        hasNeedsApproval = true;
      }
    }

    // Determine batch decision
    let batchDecision: Decision;
    let batchReason: string | undefined;

    if (hasDeny) {
      batchDecision = "deny";
      batchReason = "Batch contains denied action";
    } else if (hasNeedsApproval) {
      batchDecision = "needs_approval";
      batchReason = hasEscalation
        ? "Batch contains escalation action requiring explicit approval"
        : "Batch contains action requiring approval";
    } else {
      batchDecision = "allow";
      batchReason = "All actions allowed";
    }

    // If batch has escalation, it cannot be silently allowed
    if (hasEscalation && batchDecision === "allow") {
      batchDecision = "needs_approval";
      batchReason = "Batch contains escalation action requiring explicit approval";
    }

    return {
      decision: batchDecision,
      policyVersion: getPolicyVersion(),
      reason: batchReason,
      items: itemResults,
      hasEscalation,
    };
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