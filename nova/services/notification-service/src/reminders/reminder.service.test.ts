/**
 * Tests for ReminderService - create, get, cancel, list due reminders.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { ReminderService, ReminderNotFoundError } from "./reminder.service.js";
import { ReminderRepository } from "./reminder-repository.js";
import { ReminderDeliveryRepository } from "./reminder-delivery.js";
import { ReminderDeliveryLogRepository } from "./reminder-delivery-log.js";
import { EscalationRepository } from "./escalation-repository.js";

function makeRepo(config: any): ReminderRepository {
  const repo = new ReminderRepository({} as any);
  repo.create = async (_userId: string, input: any) => ({
    reminderId: "reminder-1",
    userId: _userId,
    title: input.title,
    message: input.message ?? null,
    dueAt: input.dueAt,
    status: "pending",
    idempotencyKey: input.idempotencyKey,
    attemptCount: 0,
    maxAttempts: input.maxAttempts ?? 5,
    cancelledAt: null,
    cancelledReason: null,
    deadLetter: false,
    deadLetterReason: null,
    createdAt: "t",
    updatedAt: "t",
  });
  repo.findById = async (_reminderId: string) => {
    if (!config.findReminder) return null;
    return {
      reminderId: _reminderId,
      userId: "user-1",
      title: "Test Reminder",
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
    };
  };
  repo.cancel = async () => Boolean(config.cancelReminder);
  repo.listDue = async () => config.listDue ?? [];
  return repo;
}

function makeDeliveryRepo(config: any): ReminderDeliveryRepository {
  const repo = new ReminderDeliveryRepository({} as any);
  let cr = config.claimResult;
  repo.claimReminder = async () => {
    const result = cr;
    cr = null;
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

describe("ReminderService", () => {
  it("creates reminder for user", async () => {
    const service = makeService({});
    const reminder = await service.createReminder("user-1", {
      title: "Take medicine",
      dueAt: "2026-10-01T10:00:00Z",
      idempotencyKey: "key-1",
    });

    assert.strictEqual(reminder.title, "Take medicine");
    assert.strictEqual(reminder.userId, "user-1");
    assert.strictEqual(reminder.status, "pending");
    assert.strictEqual(reminder.idempotencyKey, "key-1");
  });

  it("getReminder throws ReminderNotFoundError when not found", async () => {
    const service = makeService({ findReminder: null });
    await assert.rejects(
      () => service.getReminder("reminder-999"),
      ReminderNotFoundError
    );
  });

  it("cancelReminder throws ReminderNotFoundError when not cancelled", async () => {
    const service = makeService({ cancelReminder: false });
    await assert.rejects(
      () => service.cancelReminder("reminder-999"),
      ReminderNotFoundError
    );
  });

  it("listDueReminders returns due reminders", async () => {
    const service = makeService({
      listDue: [
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
      ],
    });

    const reminders = await service.listDueReminders("2026-10-01T12:00:00Z");
    assert.strictEqual(reminders.length, 1);
    assert.strictEqual(reminders[0]!.title, "Test");
  });

  it("claimReminder returns claimed reminder", async () => {
    const service = makeService({
      claimResult: {
        reminderId: "reminder-1",
        idempotencyKey: "key-1",
      },
      markDeliveredOk: true,
      markFailedOk: true,
    });

    const claimed = await service.claimReminder();
    assert.ok(claimed);
    assert.strictEqual(claimed!.reminderId, "reminder-1");
    assert.strictEqual(claimed!.idempotencyKey, "key-1");
  });

  it("claimReminder returns null when no reminders", async () => {
    const service = makeService({
      claimResult: null,
      markDeliveredOk: true,
      markFailedOk: true,
    });

    const claimed = await service.claimReminder();
    assert.strictEqual(claimed, null);
  });

  it("markDelivered succeeds", async () => {
    const service = makeService({
      claimResult: null,
      markDeliveredOk: true,
      markFailedOk: true,
    });
    await service.markDelivered("reminder-1", "msg-1", "key-1");
  });

  it("markFailed succeeds", async () => {
    const service = makeService({
      claimResult: null,
      markDeliveredOk: true,
      markFailedOk: true,
    });
    await service.markFailed("reminder-1", "provider error", "key-1");
  });

  it("reclaimOrphaned succeeds", async () => {
    const service = makeService({
      claimResult: null,
      markDeliveredOk: true,
      markFailedOk: true,
    });
    await service.reclaimOrphaned(5);
  });

  it("escalateMissed escalates missed reminders", async () => {
    const service = makeService({
      claimResult: null,
      markDeliveredOk: true,
      markFailedOk: true,
      escalateResult: [
        {
          reminderId: "reminder-1",
          idempotencyKey: "key-1",
          dueAt: "2026-10-01T09:00:00Z",
          escalationAttempts: 1,
        },
      ],
    });

    const count = await service.escalateMissed(5);
    assert.strictEqual(count, 1);
  });
});
