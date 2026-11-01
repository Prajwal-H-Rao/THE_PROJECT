/**
 * Tests for TaskService - cross-user read denial and CRUD enforcement.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { TaskService, TaskNotFoundError } from "./task.service.js";
import { TaskRepository } from "./task.repository.js";

function makeRepo(config: {
  owned: boolean;
  createTitle?: string;
  updateTitle?: string;
}): TaskRepository {
  const repo = new TaskRepository({} as any);
  repo.findById = async (_userId: string, _taskId: string) => {
    if (!config.owned) return null;
    return {
      taskId: _taskId,
      userId: _userId,
      title: config.updateTitle ?? "Task",
      description: null,
      status: "open",
      priority: 0,
      dueAt: null,
      parentTaskId: null,
      recurrenceRule: null,
      timezone: "UTC",
      createdAt: "t",
      updatedAt: "t",
    };
  };
  repo.list = async (_userId: string, _filter?: any) => {
    if (!config.owned) return [];
    return [
      {
        taskId: "t-1",
        userId: _userId,
        title: config.updateTitle ?? "Task",
        description: null,
        status: "open",
        priority: 0,
        dueAt: null,
        parentTaskId: null,
        recurrenceRule: null,
        timezone: "UTC",
        createdAt: "t",
        updatedAt: "t",
      },
    ];
  };
  repo.create = async (_userId: string, input: any) => ({
    taskId: "t-1",
    userId: _userId,
    title: input.title,
    description: null,
    status: "open",
    priority: 0,
    dueAt: null,
    parentTaskId: null,
    recurrenceRule: null,
    timezone: "UTC",
    createdAt: "t",
    updatedAt: "t",
  });
  repo.update = async (_userId: string, _taskId: string, input: any) => {
    if (!config.owned) return null;
    return {
      taskId: _taskId,
      userId: _userId,
      title: input.title ?? config.updateTitle ?? "Changed",
      description: null,
      status: "open",
      priority: 0,
      dueAt: null,
      parentTaskId: null,
      recurrenceRule: null,
      timezone: "UTC",
      createdAt: "t",
      updatedAt: "t",
    };
  };
  repo.delete = async () => config.owned;
  return repo;
}

describe("TaskService", () => {
  it("creates task for user", async () => {
    const repo = makeRepo({ owned: true });
    const service = new TaskService(repo);

    const task = await service.createTask("user-1", { title: "Task 1" });
    assert.strictEqual(task.title, "Task 1");
    assert.strictEqual(task.userId, "user-1");
  });

  it("getTask throws TaskNotFoundError when user does not own task", async () => {
    const repo = makeRepo({ owned: false });
    const service = new TaskService(repo);

    await assert.rejects(
      () => service.getTask("user-1", "task-2"),
      TaskNotFoundError
    );
  });

  it("listTasks returns empty when no tasks owned", async () => {
    const repo = makeRepo({ owned: false });
    const service = new TaskService(repo);

    const tasks = await service.listTasks("user-1");
    assert.strictEqual(tasks.length, 0);
  });

  it("updateTask throws TaskNotFoundError when user does not own task", async () => {
    const repo = makeRepo({ owned: false });
    const service = new TaskService(repo);

    await assert.rejects(
      () => service.updateTask("user-1", "task-2", { title: "Changed" }),
      TaskNotFoundError
    );
  });

  it("deleteTask throws TaskNotFoundError when user does not own task", async () => {
    const repo = makeRepo({ owned: false });
    const service = new TaskService(repo);

    await assert.rejects(
      () => service.deleteTask("user-1", "task-2"),
      TaskNotFoundError
    );
  });
});
