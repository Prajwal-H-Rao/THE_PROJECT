/** Bulk policy decision logic (Task 14). */

import {
  BulkDecisionRequest,
  BulkDecisionResponse,
  BulkDecisionItemResult,
  validateBulkDecisionRequest,
} from "./policy-bulk-schema.js";
import { PolicyDecisionService } from "./policy-decision.service.js";
import { findMatchingRule } from "./policy-loader.js";
import { getPolicyVersion } from "./policy-version.js";
import type { PolicyDecisionRequest, PolicyRule } from "./policy-schema.js";

/** Check if an action is an escalation (adds new source or submits application).
 *  WHY: Task 14 - bulk actions cannot silently enable new sources or submit applications.
 *  Uses explicit isEscalation field on the rule. */
export function isEscalationAction(rule: PolicyRule): boolean {
  // Explicit escalation flag takes precedence
  if (rule.isEscalation === true) {
    return true;
  }
  // High-risk tiers are escalations
  if (rule.riskTier === "tier3" || rule.riskTier === "tier4") {
    return true;
  }
  // Requires step-up is an escalation
  if (rule.requiresStepUp === true) {
    return true;
  }
  return false;
}

/** Make a bulk policy decision for multiple requests (Task 14).
 *  Returns allow only if all items are allow.
 *  Returns deny if any item is deny.
 *  Returns needs_approval if any item needs approval.
 *  If any item is an escalation, batch decision is needs_approval (even if all allow). */
export function decideBulk(
  request: BulkDecisionRequest,
  policyDecisionService: PolicyDecisionService,
  config: ReturnType<typeof import("./policy-loader.js").loadFamilies>
): BulkDecisionResponse {
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
    const decision = policyDecisionService.decide(item);

    // Check for escalation
    const rule = findMatchingRule(config, item);
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
  // Priority: deny > needs_approval (including escalation) > allow
  let batchDecision: "allow" | "deny" | "needs_approval";
  let batchReason: string | undefined;

  if (hasDeny) {
    batchDecision = "deny";
    batchReason = "Batch contains denied action";
  } else if (hasNeedsApproval || hasEscalation) {
    batchDecision = "needs_approval";
    batchReason = hasEscalation
      ? "Batch contains escalation action requiring explicit approval"
      : "Batch contains action requiring approval";
  } else {
    batchDecision = "allow";
    batchReason = "All actions allowed";
  }

  return {
    decision: batchDecision,
    policyVersion: getPolicyVersion(),
    reason: batchReason,
    items: itemResults,
    hasEscalation,
  };
}