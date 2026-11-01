/**
 * Tests for ReminderWorker - outbox polling, idempotent delivery,
 * delivery success and failure handling.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { ReminderWorker } from "./reminder.worker.js";
import { ReminderRepository } from "./reminder-repository.js";
import { ReminderService } from "./reminder.service.js";
import { ReminderDeliveryRepository } from "./reminder-delivery.js";

function makeRepo(config: {
  dueReminders: any[];
  deliverSucceeds: boolean;
  markDeliveredOk: boolean;
  markFailedOk: boolean;
}): ReminderRepository {
  const repo = new ReminderRepository({} as any) as any;
  const reminders = [...config.dueReminders];
  repo.listDue = async () => reminders;
  repo.claimReminder = async () => {
    const reminder = reminders.shift();
    if (!reminder) return null;
    return {
      reminderId: reminder.reminderId,
      idempotencyKey: reminder.idempotencyKey,
    };
  };
  return repo;
}

function makeDeliveryRepo(config: {
  claimResult: { reminderId: string; idempotencyKey: string } | null;
  markDeliveredOk: boolean;
  markFailedOk: boolean;
}): ReminderDeliveryRepository {
  const repo = new ReminderDeliveryRepository({} as any) as any;
  let claimResult = config.claimResult;
  repo.claimReminder = async () => {
    const result = claimResult;
    claimResult = null;
    return result;
  };
  repo.markDelivered = async () => {
    if (!config.markDeliveredOk) throw new Error("delivery record failed");
  };
  repo.markFailed = async () => {
    if (!config.markFailedOk) throw new Error("failure record failed");
  };
  repo.reclaimOrphaned = async () => {};
  return repo;
}

describe("ReminderWorker", () => {
  it("delivers due reminders and marks delivered", async () => {
    const reminders = [
      {
        reminderId: "reminder-1",
        userId: "user-1",
        title: "Test",
        message: null,
        dueAt: "2026-10-01T10:00:00Z",
        status: "pending",
        idempotencyKey: "key-1",
        attemptCount: 0,
        maxAttempts: 5,
        cancelledAt: null,
        cancelledReason: null,
        deadLetter: false,
        deadLetterReason: null,
        createdAt: "t",
        updatedAt: "t",
      },
    ];
    const repo = makeRepo({
      dueReminders: reminders,
      deliverSucceeds: true,
      markDeliveredOk: true,
      markFailedOk: true,
    });
    const deliveryRepo = makeDeliveryRepo({
      claimResult: {
        reminderId: "reminder-1",
        idempotencyKey: "key-1",
      },
      markDeliveredOk: true,
      markFailedOk: true,
    });
    const service = new ReminderService(repo, deliveryRepo);
    const worker = new ReminderWorker(repo, service, {
      pollIntervalMs: 1000,
      batchSize: 10,
    });

    const result = await worker.poll();
    assert.strictEqual(result.delivered, 1);
    assert.strictEqual(result.failed, 0);
    assert.strictEqual(result.skipped, 0);
    worker.stop();
  });

  it("marks failed reminders when delivery fails", async () => {
    const reminders = [
      {
        reminderId: "reminder-1",
        userId: "user-1",
        title: "Test",
        message: null,
        dueAt: "2026-10-01T10:00:00Z",
        status: "pending",
        idempotencyKey: "key-1",
        attemptCount: 0,
        maxAttempts: 5,
        cancelledAt: null,
        cancelledReason: null,
        deadLetter: false,
        deadLetterReason: null,
        createdAt: "t",
        updatedAt: "t",
      },
    ];
    class FailingWorker extends ReminderWorker {
      protected async deliverReminder(reminder: any): Promise<string> {
        throw new Error("provider down");
      }
    }
    const repo = makeRepo({
      dueReminders: reminders,
      deliverSucceeds: false,
      markDeliveredOk: true,
      markFailedOk: true,
    });
    const deliveryRepo = makeDeliveryRepo({
      claimResult: {
        reminderId: "reminder-1",
        idempotencyKey: "key-1",
      },
      markDeliveredOk: true,
      markFailedOk: true,
    });
    const service = new ReminderService(repo, deliveryRepo);
    const worker = new FailingWorker(repo, service, {
      pollIntervalMs: 1000,
      batchSize: 10,
    });

    const result = await worker.poll();
    assert.strictEqual(result.delivered, 0);
    assert.strictEqual(result.failed, 1);
    worker.stop();
  });

  it("skips when no due reminders", async () => {
    const repo = makeRepo({
      dueReminders: [],
      deliverSucceeds: true,
      markDeliveredOk: true,
      markFailedOk: true,
    });
    const deliveryRepo = makeDeliveryRepo({
      claimResult: null,
      markDeliveredOk: true,
      markFailedOk: true,
    });
    const service = new ReminderService(repo, deliveryRepo);
    const worker = new ReminderWorker(repo, service, {
      pollIntervalMs: 1000,
      batchSize: 10,
    });

    const result = await worker.poll();
    assert.strictEqual(result.delivered, 0);
    assert.strictEqual(result.failed, 0);
    assert.strictEqual(result.skipped, 0);
    worker.stop();
  });

  it("does not run concurrent polls", async () => {
    const reminders = [
      {
        reminderId: "reminder-1",
        userId: "user-1",
        title: "Test",
        message: null,
        dueAt: "2026-10-01T10:00:00Z",
        status: "pending",
        idempotencyKey: "key-1",
        attemptCount: 0,
        maxAttempts: 5,
        cancelledAt: null,
        cancelledReason: null,
        deadLetter: false,
        deadLetterReason: null,
        createdAt: "t",
        updatedAt: "t",
      },
    ];
    const repo = makeRepo({
      dueReminders: reminders,
      deliverSucceeds: true,
      markDeliveredOk: true,
      markFailedOk: true,
    });
    const deliveryRepo = makeDeliveryRepo({
      claimResult: {
        reminderId: "reminder-1",
        idempotencyKey: "key-1",
      },
      markDeliveredOk: true,
      markFailedOk: true,
    });
    const service = new ReminderService(repo, deliveryRepo);
    const worker = new ReminderWorker(repo, service, {
      pollIntervalMs: 1000,
      batchSize: 10,
    });

    // Start first poll
    const p1 = worker.poll();
    // Second poll should skip (running)
    const p2 = await worker.poll();
    await p1;

    assert.strictEqual(p2.delivered, 0);
    assert.strictEqual(p2.failed, 0);
    assert.strictEqual(p2.skipped, 0);
    worker.stop();
  });
});
