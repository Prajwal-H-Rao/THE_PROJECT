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
import { ReminderDeliveryLogRepository } from "./reminder-delivery-log.js";
import { EscalationService } from "./escalation-service.js";
import { EscalationRepository } from "./escalation-repository.js";

function makeRepo(config: any): ReminderRepository {
  const repo = new ReminderRepository({} as any) as any;
  const reminders = [...config.dueReminders];
  repo.listDue = async () => reminders;
  repo.claimReminder = async () => {
    const reminder = reminders.shift();
    if (!reminder) return null;
    return { reminderId: reminder.reminderId, idempotencyKey: reminder.idempotencyKey };
  };
  return repo;
}

function makeDeliveryRepo(config: any): ReminderDeliveryRepository {
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

function makeEscalationRepo(config: any): EscalationRepository {
  const repo = new EscalationRepository({} as any);
  let results = [...(config.escalateResult || [])];
  repo.claimAndEscalate = async () => {
    const result = results.shift();
    if (!result) return [];
    return [result];
  };
  return repo;
}

function makeService(config: any): ReminderService {
  const repo = makeRepo(config);
  const deliveryRepo = makeDeliveryRepo(config);
  const escalationRepo = makeEscalationRepo(config);
  const deliveryLogRepo = new ReminderDeliveryLogRepository({} as any);
  return new ReminderService(repo, deliveryRepo, deliveryLogRepo, escalationRepo);
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
    const escalationRepo = makeEscalationRepo({
      escalateResult: [],
    });
    const service = new ReminderService(repo, deliveryRepo, new ReminderDeliveryLogRepository({} as any), escalationRepo);
    const worker = new ReminderWorker(repo, service, new EscalationService(escalationRepo), {
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
    const escalationRepo = makeEscalationRepo({
      escalateResult: [],
    });
    const service = new ReminderService(repo, deliveryRepo, new ReminderDeliveryLogRepository({} as any), escalationRepo);
    const worker = new FailingWorker(repo, service, new EscalationService(escalationRepo), {
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
    const escalationRepo = makeEscalationRepo({
      escalateResult: [],
    });
    const service = new ReminderService(repo, deliveryRepo, new ReminderDeliveryLogRepository({} as any), escalationRepo);
    const worker = new ReminderWorker(repo, service, new EscalationService(escalationRepo), {
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
    const escalationRepo = makeEscalationRepo({
      escalateResult: [],
    });
    const service = new ReminderService(repo, deliveryRepo, new ReminderDeliveryLogRepository({} as any), escalationRepo);
    const worker = new ReminderWorker(repo, service, new EscalationService(escalationRepo), {
      pollIntervalMs: 1000,
      batchSize: 10,
    });

    const p1 = worker.poll();
    const p2 = await worker.poll();
    await p1;

    assert.strictEqual(p2.delivered, 0);
    assert.strictEqual(p2.failed, 0);
    assert.strictEqual(p2.skipped, 0);
    worker.stop();
  });

  it("escalates missed reminders", async () => {
    const escalatedReminder = {
      reminderId: "reminder-1",
      idempotencyKey: "key-1",
      dueAt: "2026-10-01T09:00:00Z",
      escalationAttempts: 1,
    };
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
    const escalationRepo = makeEscalationRepo({
      escalateResult: [escalatedReminder],
    });
    const service = new ReminderService(repo, deliveryRepo, new ReminderDeliveryLogRepository({} as any), escalationRepo);
    const worker = new ReminderWorker(repo, service, new EscalationService(escalationRepo), {
      pollIntervalMs: 1000,
      batchSize: 10,
    });

    const result = await worker.poll();
    assert.strictEqual(result.escalated, 1);
    assert.strictEqual(result.delivered, 0);
    worker.stop();
  });
});
