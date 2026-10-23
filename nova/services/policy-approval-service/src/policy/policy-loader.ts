/** Loads and validates policy family definitions from YAML. */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml";
import { PolicyRule, validatePolicyRule, Sensitivity, BlastRadius, RiskTier, Decision } from "./policy-schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");

export interface FamilyDefinition {
  readonly name: string;
  readonly description: string;
  readonly defaultSensitivity: Sensitivity;
  readonly defaultBlastRadius: BlastRadius;
  readonly defaultRiskTier: RiskTier;
  readonly defaultDecision: Decision;
  readonly rules: readonly PolicyRule[];
}

export interface FamiliesConfig {
  readonly families: readonly FamilyDefinition[];
}

/** Load the families configuration from the YAML file. */
export function loadFamilies(configPath?: string): FamiliesConfig {
  const path = configPath ?? resolve(__dirname, "families.yaml");
  const content = readFileSync(path, "utf8");
  const parsed = yaml.load(content) as FamiliesConfig;

  if (!parsed || !Array.isArray(parsed.families)) {
    throw new Error("families.yaml must contain a 'families' array");
  }

  // Validate each family
  for (const family of parsed.families) {
    if (!family.name || typeof family.name !== "string") {
      throw new Error("Each family must have a name");
    }
    if (!Array.isArray(family.rules) || family.rules.length === 0) {
      throw new Error(`Family ${family.name} must have at least one rule`);
    }
    for (const rule of family.rules) {
      if (!validatePolicyRule(rule)) {
        throw new Error(`Invalid policy rule in family ${family.name}: ${JSON.stringify(rule)}`);
      }
    }
  }

  return parsed;
}

/** Get all rules across all families as a flat array. */
export function getAllRules(config: FamiliesConfig): readonly PolicyRule[] {
  return config.families.flatMap((f) => f.rules);
}

/** Find a rule by ID across all families. */
export function findRuleById(config: FamiliesConfig, ruleId: string): PolicyRule | undefined {
  for (const family of config.families) {
    const rule = family.rules.find((r) => r.id === ruleId);
    if (rule) {
      return rule;
    }
  }
  return undefined;
}

/** Find the best matching rule for a decision request. */
export function findMatchingRule(
  config: FamiliesConfig,
  request: { readonly actor: string; readonly scope: string; readonly action: string; readonly target: string }
): PolicyRule | undefined {
  // Strategy: find the most specific rule that matches the request
  // Priority: exact action match > scope match > family default
  const allRules = getAllRules(config);

  // First, try to find a rule where allowedActions includes the action
  const actionMatches = allRules.filter((rule) =>
    rule.allowedActions?.includes(request.action) ?? false
  );

  if (actionMatches.length > 0) {
    // Return the most specific (highest risk tier) match
    const tierOrder = { tier4: 4, tier3: 3, tier2: 2, tier1: 1 };
    return actionMatches.reduce((best, current) =>
      tierOrder[current.riskTier] > tierOrder[best.riskTier] ? current : best
    );
  }

  // Fallback: match by scope
  const scopeMatches = allRules.filter((rule) => rule.scope === request.scope);
  if (scopeMatches.length > 0) {
    const tierOrder = { tier4: 4, tier3: 3, tier2: 2, tier1: 1 };
    return scopeMatches.reduce((best, current) =>
      tierOrder[current.riskTier] > tierOrder[best.riskTier] ? current : best
    );
  }

  // No match found
  return undefined;
}