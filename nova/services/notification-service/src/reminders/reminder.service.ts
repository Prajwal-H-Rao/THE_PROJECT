/**
 * Nova design system - Reminder service.
 * Create, get, cancel, list due reminders.
 * Claim, mark delivered, mark failed, reclaim orphaned reminders.
 * Delivery is outbox-driven: claim (lock), deliver (outside lock),
 * mark delivered/failed (commit). Idempotency key prevents duplicate
 * delivery log rows across retries.
 */

import { Injectable } from "@nestjs/common";
import { ReminderRepository } from "./reminder-repository.js";
import { ReminderDeliveryRepository } from "./reminder-delivery.js";
import { ReminderDeliveryLogRepository } from "./reminder-delivery-log.js";
import { EscalationRepository } from "./escalation-repository.js";
import type { Reminder, CreateReminderInput, ClaimedReminder, ReminderDeliveryLog } from "./reminder.entity.js";
import type { EscalatedReminder } from "./escalation-repository.js";

export class ReminderNotFoundError extends Error {
  constructor(public readonly reminderId: string) {
    super(`Reminder not found: ${reminderId}`);
    this.name = "ReminderNotFoundError";
  }
}

export class ReminderAlreadyExistsError extends Error {
  constructor(public readonly idempotencyKey: string) {
    super(`Reminder already exists: ${idempotencyKey}`);
    this.name = "ReminderAlreadyExistsError";
  }
}

@Injectable()
export class ReminderService {
  constructor(
    private readonly repository: ReminderRepository,
    private readonly deliveryRepository: ReminderDeliveryRepository,
    private readonly deliveryLogRepository: ReminderDeliveryLogRepository,
    private readonly escalationRepository: EscalationRepository
  ) {}

  /** Create one reminder for one user.
   * Idempotency key prevents duplicates. */
  async createReminder(userId: string, input: CreateReminderInput): Promise<Reminder> {
    try {
      return await this.repository.create(userId, input);
    } catch (error) {
      if (error instanceof Error && error.message.includes("unique")) {
        throw new ReminderAlreadyExistsError(input.idempotencyKey);
      }
      throw error;
    }
  }

  /** Read one reminder by ID.
   * Throws ReminderNotFoundError if not found. */
  async getReminder(reminderId: string): Promise<Reminder> {
    const reminder = await this.repository.findById(reminderId);
    if (!reminder) {
      throw new ReminderNotFoundError(reminderId);
    }
    return reminder;
  }

  /** Cancel one reminder.
   * Throws ReminderNotFoundError if not found or not pending. */
  async cancelReminder(reminderId: string): Promise<void> {
    const cancelled = await this.repository.cancel(reminderId);
    if (!cancelled) {
      throw new ReminderNotFoundError(reminderId);
    }
  }

  /** List pending reminders due at or before the given time. */
  async listDueReminders(before: string, limit = 50): Promise<Reminder[]> {
    return this.repository.listDue(before, limit);
  }

  /** Claim one pending reminder for delivery.
   * Uses SELECT ... FOR UPDATE SKIP LOCKED so concurrent workers never
   * claim the same reminder. Returns the reminder id and idempotency key,
   * or null if no reminder is available. */
  async claimReminder(): Promise<ClaimedReminder | null> {
    return this.deliveryRepository.claimReminder();
  }

  /** Mark one claimed reminder as delivered.
   * Matches status='processing'. Inserts delivery log with
   * ON CONFLICT (idempotency_key) DO NOTHING. */
  async markDelivered(
    reminderId: string,
    providerMessageId: string,
    idempotencyKey: string
  ): Promise<void> {
    return this.deliveryRepository.markDelivered(
      reminderId,
      providerMessageId,
      idempotencyKey
    );
  }

  /** Mark one claimed reminder as failed.
   * Matches status='processing'. Increments attempt count. Marks as dead
   * letter if attempts exceed max. Inserts delivery log with
   * ON CONFLICT (idempotency_key) DO NOTHING. */
  async markFailed(
    reminderId: string,
    errorMessage: string,
    idempotencyKey: string
  ): Promise<void> {
    return this.deliveryRepository.markFailed(
      reminderId,
      errorMessage,
      idempotencyKey
    );
  }

  /** Reclaim orphaned processing reminders older than the staleness
   * threshold. Resets them to pending so another worker can claim them. */
  async reclaimOrphaned(staleMinutes: number = 5): Promise<void> {
    return this.deliveryRepository.reclaimOrphaned(staleMinutes);
  }

  /** Escalate missed reminders past due without delivery.
   * Claims reminders with escalated = false and status != 'delivered'
   * and due_at < now(), marks them escalated atomically, then calls
   * escalateReminder for each. Returns the number escalated. */
  async escalateMissed(limit = 50): Promise<number> {
    const claimed = await this.escalationRepository.claimAndEscalate(limit);
    for (const reminder of claimed) {
      await this.escalateReminder(reminder);
    }
    return claimed.length;
  }

  /** Escalate one reminder to its notification channel.
   * Hook method for escalation notification delivery. Default
   * implementation logs the escalation. Override to send SMS/email/
   * push notification. */
  protected async escalateReminder(reminder: EscalatedReminder): Promise<void> {
    // Hook for escalation notification delivery.
    // Override to send to SMS/email/push notification provider.
  }

  /** Find delivery log entries by reminder ID. */
  async findDeliveryLogByReminderId(reminderId: string): Promise<ReminderDeliveryLog[]> {
    return this.deliveryLogRepository.findByReminderId(reminderId);
  }

  /** Find delivery log entries by status. */
  async findDeliveryLogByStatus(status: string): Promise<ReminderDeliveryLog[]> {
    return this.deliveryLogRepository.findByStatus(status);
  }

  /** Find delivery log entries by date range (delivered_at between startDate and endDate). */
  async findDeliveryLogByDateRange(startDate: string, endDate: string): Promise<ReminderDeliveryLog[]> {
    return this.deliveryLogRepository.findByDateRange(startDate, endDate);
  }
}
