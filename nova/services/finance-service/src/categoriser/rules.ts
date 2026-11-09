/**
 * Nova design system - Rule-based categoriser (task 11.6, module 11).
 * Deterministic first-match-wins categorisation. Rules are ordered by
 * priority (descending) then insertion order (ascending, stable). The
 * first rule whose pattern matches the merchant wins; no match yields
 * "uncategorised". Pure stdlib, no pg, no credentials (Spec:741).
 * Integer minor units throughout (Spec:826); categorize only (Spec:190).
 */

export interface CategorisationRule {
  readonly id: string;
  readonly pattern: string;
  readonly category: string;
  readonly priority: number;
  readonly insertionOrder: number;
}

export interface CategorisationResult {
  readonly category: string;
  readonly matchedRuleId: string | null;
}

// Purpose: normalise a merchant string for matching (trim, lowercase).
function normalise(merchant: string): string {
  return merchant.trim().toLowerCase();
}

// Purpose: test whether a rule's pattern matches a merchant.
// Pattern is matched case-insensitively as a substring of the merchant.
// Exact match when the pattern is wrapped in slashes, e.g. /EXACT/.
function patternMatches(pattern: string, merchantNormalised: string): boolean {
  const p = pattern.trim().toLowerCase();
  if (p.startsWith("/") && p.endsWith("/") && p.length > 2) {
    return merchantNormalised === p.slice(1, -1);
  }
  return merchantNormalised.includes(p);
}

export class Categoriser {
  private readonly rules: CategorisationRule[] = [];
  private insertionCounter = 0;

  // Purpose: register a categorisation rule. Higher priority wins; ties
  // break by insertion order (first inserted wins).
  addRule(
    id: string,
    pattern: string,
    category: string,
    priority = 0,
  ): void {
    this.rules.push({
      id,
      pattern,
      category,
      priority,
      insertionOrder: this.insertionCounter++,
    });
    // Keep rules sorted so categorise can stop at the first match.
    this.rules.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.insertionOrder - b.insertionOrder;
    });
  }

  // Purpose: categorise a transaction by merchant. Returns the first
  // matching rule's category and id, or "uncategorised" with a null id.
  categorise(
    merchant: string,
    amountMinor: number,
    currency: string,
  ): CategorisationResult {
    const merchantNormalised = normalise(merchant);
    for (const rule of this.rules) {
      if (patternMatches(rule.pattern, merchantNormalised)) {
        return { category: rule.category, matchedRuleId: rule.id };
      }
    }
    return { category: "uncategorised", matchedRuleId: null };
  }
}
