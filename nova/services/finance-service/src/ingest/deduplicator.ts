/**
 * Nova design system - Content-addressed deduplicator (task 11.4, module 11).
 * Pure stdlib module: content hash -> stable idempotency key so re-importing
 * the same transaction content is a no-op (task 11.4 acceptance). No pg, no
 * credentials (Spec:741). Integer minor units flow through untouched
 * (Spec:826). Import and normalize only, no money movement (Spec:190).
 */

import { createHash } from "node:crypto";

export interface DeduplicatorInput {
  readonly amountMinor: number; // integer minor units (cents/pence)
  readonly currency: string;
  readonly transactionDate: string; // ISO YYYY-MM-DD
  readonly merchant: string;
  readonly source: string;
  readonly userId: string;
}

// Purpose: compute a stable SHA-256 content hash from the transaction fields
// that define a payment. Same content => same hash => same idempotency key.
export function computeContentHash(txn: DeduplicatorInput): string {
  const payload = JSON.stringify({
    amountMinor: txn.amountMinor,
    currency: txn.currency,
    transactionDate: txn.transactionDate,
    merchant: txn.merchant,
    source: txn.source,
    userId: txn.userId,
  });
  return createHash("sha256").update(payload).digest("hex");
}

// Purpose: build a stable, namespaced idempotency key from the content hash.
export function makeIdempotencyKey(userId: string, contentHash: string): string {
  return `finance:${userId}:${contentHash}`;
}

// Purpose: report whether an idempotency key already exists in a set of
// previously-seen keys. Used by the service layer to short-circuit re-import.
export function isDuplicate(existingKeys: Set<string>, key: string): boolean {
  return existingKeys.has(key);
}
