/**
 * Nova design system - Override history (task 11.6, module 11).
 * Records category overrides applied to transactions so a user's manual
 * correction is durable and auditable. Pure stdlib, no pg, no credentials
 * (Spec:741). Integer minor units throughout (Spec:826).
 */

export interface OverrideRecord {
  readonly transactionId: string;
  readonly oldCategory: string;
  readonly newCategory: string;
  readonly reason: string;
  readonly timestamp: string; // ISO 8601 UTC
}

export class OverrideHistory {
  private readonly history: Map<string, OverrideRecord[]> = new Map();

  // Purpose: record that a transaction's category was overridden from
  // oldCategory to newCategory for the given reason.
  recordOverride(
    transactionId: string,
    oldCategory: string,
    newCategory: string,
    reason: string,
  ): void {
    const record: OverrideRecord = {
      transactionId,
      oldCategory,
      newCategory,
      reason,
      timestamp: new Date().toISOString(),
    };
    const list = this.history.get(transactionId) ?? [];
    list.push(record);
    this.history.set(transactionId, list);
  }

  // Purpose: return all overrides applied to a transaction, in
  // chronological order. Empty list when none recorded.
  getOverrideHistory(transactionId: string): OverrideRecord[] {
    return [...(this.history.get(transactionId) ?? [])];
  }
}
