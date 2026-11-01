/**
 * Tests for ReminderService - create, get, cancel, list due reminders.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { ReminderService, ReminderNotFoundError } from "./reminder.service.js";
import { ReminderRepository } from "./reminder-repository.js";
import { ReminderDeliveryRepository } from "./reminder-delivery.js";

function makeRepo(config: {
  createReminder?: any;
  findReminder?: any;
  cancelReminder?: boolean;
  listDue?: any;
}): ReminderRepository {
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

function makeDeliveryRepo(config: {
  claimResult: { reminderId: string; idempotencyKey: string } | null;
  markDeliveredOk: boolean;
  markFailedOk: boolean;
}): ReminderDeliveryRepository {
  const repo = new ReminderDeliveryRepository({} as any);
  repo.claimReminder = async () => config.claimResult;
  repo.markDelivered = async () => {
    if (!config.markDeliveredOk) throw new Error("delivery record failed");
  };
  repo.markFailed = async () => {
    if (!config.markFailedOk) throw new Error("failure record failed");
  };
  repo.reclaimOrphaned = async () => {};
  return repo;
}

describe("ReminderService", () => {
  it("creates reminder for user", async () => {
    const repo = makeRepo({});
    const deliveryRepo = makeDeliveryRepo({
      claimResult: null,
      markDeliveredOk: true,
      markFailedOk: true,
    });
    const service = new ReminderService(repo, deliveryRepo);

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
    const repo = makeRepo({ findReminder: null });
    const deliveryRepo = makeDeliveryRepo({
      claimResult: null,
      markDeliveredOk: true,
      markFailedOk: true,
    });
    const service = new ReminderService(repo, deliveryRepo);

    await assert.rejects(
      () => service.getReminder("reminder-999"),
      ReminderNotFoundError
    );
  });

  it("cancelReminder throws ReminderNotFoundError when not cancelled", async () => {
    const repo = makeRepo({ cancelReminder: false });
    const deliveryRepo = makeDeliveryRepo({
      claimResult: null,
      markDeliveredOk: true,
      markFailedOk: true,
    });
    const service = new ReminderService(repo, deliveryRepo);

    await assert.rejects(
      () => service.cancelReminder("reminder-999"),
      ReminderNotFoundError
    );
  });

  it("listDueReminders returns due reminders", async () => {
    const repo = makeRepo({
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
    const deliveryRepo = makeDeliveryRepo({
      claimResult: null,
      markDeliveredOk: true,
      markFailedOk: true,
    });
    const service = new ReminderService(repo, deliveryRepo);

    const reminders = await service.listDueReminders("2026-10-01T12:00:00Z");
    assert.strictEqual(reminders.length, 1);
    assert.strictEqual(reminders[0]!.title, "Test");
  });

  it("claimReminder returns claimed reminder", async () => {
    const repo = makeRepo({});
    const deliveryRepo = makeDeliveryRepo({
      claimResult: {
        reminderId: "reminder-1",
        idempotencyKey: "key-1",
      },
      markDeliveredOk: true,
      markFailedOk: true,
    });
    const service = new ReminderService(repo, deliveryRepo);

    const claimed = await service.claimReminder();
    assert.ok(claimed);
    assert.strictEqual(claimed!.reminderId, "reminder-1");
    assert.strictEqual(claimed!.idempotencyKey, "key-1");
  });

  it("claimReminder returns null when no reminders", async () => {
    const repo = makeRepo({});
    const deliveryRepo = makeDeliveryRepo({
      claimResult: null,
      markDeliveredOk: true,
      markFailedOk: true,
    });
    const service = new ReminderService(repo, deliveryRepo);

    const claimed = await service.claimReminder();
    assert.strictEqual(claimed, null);
  });

  it("markDelivered succeeds", async () => {
    const repo = makeRepo({});
    const deliveryRepo = makeDeliveryRepo({
      claimResult: null,
      markDeliveredOk: true,
      markFailedOk: true,
    });
    const service = new ReminderService(repo, deliveryRepo);

    await service.markDelivered("reminder-1", "msg-1", "key-1");
  });

  it("markFailed succeeds", async () => {
    const repo = makeRepo({});
    const deliveryRepo = makeDeliveryRepo({
      claimResult: null,
      markDeliveredOk: true,
      markFailedOk: true,
    });
    const service = new ReminderService(repo, deliveryRepo);

    await service.markFailed("reminder-1", "provider error", "key-1");
  });

  it("reclaimOrphaned succeeds", async () => {
    const repo = makeRepo({});
    const deliveryRepo = makeDeliveryRepo({
      claimResult: null,
      markDeliveredOk: true,
      markFailedOk: true,
    });
    const service = new ReminderService(repo, deliveryRepo);

    await service.reclaimOrphaned(5);
  });
});
