/** Loads and validates policy family definitions from YAML files. */

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml";
import { PolicyRule, validatePolicyRule, Sensitivity, BlastRadius, RiskTier, Decision } from "./policy-schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");
const FAMILIES_DIR = resolve(__dirname, "families");

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

/** Load the families configuration from all YAML files in the families directory. */
export function loadFamilies(configPath?: string): FamiliesConfig {
  const dir = configPath ?? FAMILIES_DIR;
  const files = readdirSync(dir).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
  
  if (files.length === 0) {
    throw new Error(`No family YAML files found in ${dir}`);
  }

  const families: FamilyDefinition[] = [];

  for (const file of files.sort()) {
    const path = resolve(dir, file);
    const content = readFileSync(path, "utf8");
    const parsed = yaml.load(content) as FamilyDefinition;

    if (!parsed || !parsed.name) {
      throw new Error(`${file} must contain a family definition with a 'name'`);
    }
    if (!Array.isArray(parsed.rules) || parsed.rules.length === 0) {
      throw new Error(`Family ${parsed.name} in ${file} must have at least one rule`);
    }
    for (const rule of parsed.rules) {
      if (!validatePolicyRule(rule)) {
        throw new Error(`Invalid policy rule in family ${parsed.name} (${file}): ${JSON.stringify(rule)}`);
      }
    }
    families.push(parsed);
  }

  return { families };
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
  // Priority: exact scope+action match > scope match > family default
  const allRules = getAllRules(config);

  // First, try to find a rule where allowedActions includes the action AND scope matches
  const actionScopeMatches = allRules.filter((rule) =>
    (rule.allowedActions?.includes(request.action) ?? false) && rule.scope === request.scope
  );

  if (actionScopeMatches.length > 0) {
    // Return the most specific (highest risk tier) match
    const tierOrder = { tier4: 4, tier3: 3, tier2: 2, tier1: 1 };
    return actionScopeMatches.reduce((best, current) =>
      tierOrder[current.riskTier] > tierOrder[best.riskTier] ? current : best
    );
  }

  // Second, try to find a rule where allowedActions includes the action (any scope)
  const actionMatches = allRules.filter((rule) =>
    rule.allowedActions?.includes(request.action) ?? false
  );

  if (actionMatches.length > 0) {
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