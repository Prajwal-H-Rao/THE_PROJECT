/**
 * Reminder entity - represents one user-owned reminder delivery.
 * Spec:858 — carries unique ID, attempt count, deadline, idempotency key,
 * cancellation state and dead-letter outcome.
 */

export interface Reminder {
  readonly reminderId: string;
  readonly userId: string;
  readonly title: string;
  readonly message: string | null;
  readonly dueAt: string;
  readonly status: string;
  readonly idempotencyKey: string;
  readonly attemptCount: number;
  readonly maxAttempts: number;
  readonly cancelledAt: string | null;
  readonly cancelledReason: string | null;
  readonly deadLetter: boolean;
  readonly deadLetterReason: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateReminderInput {
  readonly title: string;
  readonly message?: string;
  readonly dueAt: string;
  readonly idempotencyKey: string;
  readonly maxAttempts?: number;
}

export interface ReminderDeliveryLog {
  readonly logId: string;
  readonly reminderId: string;
  readonly providerMessageId: string | null;
  readonly deliveredAt: string | null;
  readonly status: string;
  readonly errorMessage: string | null;
  readonly idempotencyKey: string;
  readonly createdAt: string;
}

export interface ClaimedReminder {
  readonly reminderId: string;
  readonly idempotencyKey: string;
}
