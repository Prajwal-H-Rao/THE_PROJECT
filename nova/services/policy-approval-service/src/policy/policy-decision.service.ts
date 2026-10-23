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
import { createHash } from "node:crypto";

@Injectable()
export class PolicyDecisionService {
  private readonly config = loadFamilies();
  private readonly policyVersion = 1;

  /** Make a policy decision for the given request. */
  decide(request: PolicyDecisionRequest): PolicyDecisionResponse {
    if (!validateDecisionRequest(request)) {
      return {
        decision: "deny",
        ruleId: "invalid_request",
        policyVersion: this.policyVersion,
        reason: "Invalid decision request format",
      };
    }

    const rule = findMatchingRule(this.config, request);

    if (!rule) {
      return {
        decision: "deny",
        ruleId: "no_matching_rule",
        policyVersion: this.policyVersion,
        reason: `No policy rule matches actor=${request.actor}, scope=${request.scope}, action=${request.action}, target=${request.target}`,
      };
    }

    // Deterministic decision based on the rule
    const decision = rule.defaultDecision;

    if (decision === "needs_approval" && request.payloadHash) {
      // Generate approval requirements bound to the payload hash
      const nonce = createHash("sha256")
        .update(request.payloadHash + Date.now().toString())
        .digest("hex")
        .slice(0, 16);
      return {
        decision: "needs_approval",
        ruleId: rule.id,
        policyVersion: this.policyVersion,
        reason: `Action requires approval per rule ${rule.id}`,
        approvalRequired: {
          payloadHash: request.payloadHash,
          expirySeconds: 3600, // 1 hour default
          nonce,
          requiresStepUp: rule.requiresStepUp ?? false,
        },
      };
    }

    return {
      decision,
      ruleId: rule.id,
      policyVersion: this.policyVersion,
      reason: decision === "allow" ? "Allowed by policy" : "Denied by policy",
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