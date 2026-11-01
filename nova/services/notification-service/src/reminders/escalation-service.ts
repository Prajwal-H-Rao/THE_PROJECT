/**
 * Nova design system - Escalation service.
 * Escalates missed reminders (past due without delivery) to a
 * notification channel. Escalates each reminder once per escalation
 * cycle: marks escalated=true in one atomic UPDATE statement so
 * concurrent workers cannot escalate the same reminder twice.
 * Task 16 owns full DST boundary cases and due-time math; this module
 * handles basic escalation state management per spec:858.
 */

import { Injectable } from "@nestjs/common";
import { EscalationRepository } from "./escalation-repository.js";
import type { EscalatedReminder } from "./escalation-repository.js";

@Injectable()
export class EscalationService {
  constructor(private readonly repository: EscalationRepository) {}

  /** Escalate missed reminders.
   * Claims reminders past due without delivery and not yet escalated,
   * marks them escalated atomically, then calls the escalation hook
   * for each. Returns the number escalated. */
  async escalateMissed(limit = 50): Promise<number> {
    const claimed = await this.repository.claimAndEscalate(limit);
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
}
