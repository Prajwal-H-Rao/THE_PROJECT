/**
 * Nova design system - Reminder worker.
 * Outbox-driven polling for due reminders.
 * Claims pending reminders with SELECT ... FOR UPDATE SKIP LOCKED,
 * delivers each one outside the transaction, then marks delivered or
 * failed. Reclaims orphaned processing reminders periodically so a
 * crashed worker does not leave reminders stuck.
 */

import { ReminderRepository } from "./reminder-repository.js";
import { ReminderService } from "./reminder.service.js";

export interface ReminderWorkerOptions {
  readonly pollIntervalMs?: number;
  readonly batchSize?: number;
  readonly reclaimIntervalMs?: number;
  readonly reclaimStaleMinutes?: number;
}

export class ReminderWorker {
  private repository: ReminderRepository;
  private service: ReminderService;
  private options: Required<ReminderWorkerOptions>;
  private timer: ReturnType<typeof setInterval> | null = null;
  private reclaimTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    repository: ReminderRepository,
    service: ReminderService,
    options: ReminderWorkerOptions = {}
  ) {
    this.repository = repository;
    this.service = service;
    this.options = {
      pollIntervalMs: options.pollIntervalMs ?? 30000,
      batchSize: options.batchSize ?? 50,
      reclaimIntervalMs: options.reclaimIntervalMs ?? 300000,
      reclaimStaleMinutes: options.reclaimStaleMinutes ?? 5,
    };
  }

  /** Start the polling loop on the configured interval. */
  start(): void {
    if (this.timer !== null) {
      return;
    }
    this.timer = setInterval(() => {
      void this.poll();
    }, this.options.pollIntervalMs);
    this.reclaimTimer = setInterval(() => {
      void this.reclaim();
    }, this.options.reclaimIntervalMs);
  }

  /** Stop the polling loop. */
  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.reclaimTimer !== null) {
      clearInterval(this.reclaimTimer);
      this.reclaimTimer = null;
    }
  }

  /** Run one poll cycle: claim due reminders, deliver each one. */
  async poll(): Promise<{ delivered: number; failed: number; skipped: number }> {
    if (this.running) {
      return { delivered: 0, failed: 0, skipped: 0 };
    }
    this.running = true;
    try {
      return await this.pollCycle();
    } finally {
      this.running = false;
    }
  }

  private async pollCycle(): Promise<{ delivered: number; failed: number; skipped: number }> {
    let delivered = 0;
    let failed = 0;
    let skipped = 0;

    while (true) {
      const claimed = await this.service.claimReminder();
      if (!claimed) {
        break;
      }

      try {
        const providerMessageId = await this.deliverReminder(claimed);
        await this.service.markDelivered(
          claimed.reminderId,
          providerMessageId,
          claimed.idempotencyKey
        );
        delivered++;
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        await this.service.markFailed(
          claimed.reminderId,
          errMsg,
          claimed.idempotencyKey
        );
        failed++;
      }
    }

    return { delivered, failed, skipped };
  }

  /** Reclaim orphaned processing reminders older than the staleness
   * threshold so another worker can claim them. */
  async reclaim(): Promise<void> {
    await this.service.reclaimOrphaned(this.options.reclaimStaleMinutes);
  }

  /** Deliver one reminder via notification provider.
   * Mock implementation always succeeds with a generated provider message ID.
   * Real implementation would call SMS/email/push provider API. */
  protected async deliverReminder(claimed: { reminderId: string; idempotencyKey: string }): Promise<string> {
    return `msg-${crypto.randomUUID()}`;
  }
}
