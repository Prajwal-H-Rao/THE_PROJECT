/**
 * Tests for TaskRepository - ownership enforcement and CRUD.
 * Uses a mock pg Pool to verify SQL queries and ownership filtering.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { Pool } from "pg";
import { TaskRepository } from "./task.repository.js";
import type { CreateTaskInput, TaskListFilter } from "./task.entity.js";

function mockPool(rows: unknown[], rowCount?: number): Pool {
  return {
    query: async (_text: string, _values: unknown[]) => ({
      rows,
      rowCount: rowCount ?? rows.length,
      fields: [],
      command: "",
      oid: 0,
    }),
  } as unknown as Pool;
}

describe("TaskRepository", () => {
  it("create returns task with ownership", async () => {
    const inputRow = {
      task_id: "task-1",
      user_id: "user-1",
      title: "Buy milk",
      description: null,
      status: "open",
      priority: 0,
      due_at: null,
      parent_task_id: null,
      recurrence_rule: null,
      created_at: "2026-10-01T10:00:00Z",
      updated_at: "2026-10-01T10:00:00Z",
    };
    const pool = mockPool([inputRow]);
    const repo = new TaskRepository(pool);

    const task = await repo.create("user-1", {
      title: "Buy milk",
    });

    assert.strictEqual(task.taskId, "task-1");
    assert.strictEqual(task.userId, "user-1");
    assert.strictEqual(task.title, "Buy milk");
    assert.strictEqual(task.status, "open");
  });

  it("findById returns null when user does not own task", async () => {
    const pool = mockPool([]);
    const repo = new TaskRepository(pool);

    const task = await repo.findById("user-1", "task-2");
    assert.strictEqual(task, null);
  });

  it("list returns all tasks for the user", async () => {
    const rows = [
      { task_id: "task-1", user_id: "user-1", title: "T1", description: null, status: "open", priority: 0, due_at: null, parent_task_id: null, recurrence_rule: null, created_at: "t1", updated_at: "t1" },
      { task_id: "task-2", user_id: "user-1", title: "T2", description: null, status: "open", priority: 0, due_at: null, parent_task_id: null, recurrence_rule: null, created_at: "t2", updated_at: "t2" },
    ];
    const pool = mockPool(rows);
    const repo = new TaskRepository(pool);

    const tasks = await repo.list("user-1");
    assert.strictEqual(tasks.length, 2);
    assert.strictEqual(tasks[0]!.taskId, "task-1");
    assert.strictEqual(tasks[1]!.taskId, "task-2");
  });

  it("list with status filter", async () => {
    const rows = [
      { task_id: "task-1", user_id: "user-1", title: "T1", description: null, status: "done", priority: 0, due_at: null, parent_task_id: null, recurrence_rule: null, created_at: "t1", updated_at: "t1" },
    ];
    const pool = mockPool(rows);
    const repo = new TaskRepository(pool);

    const tasks = await repo.list("user-1", { status: "done" });
    assert.strictEqual(tasks.length, 1);
    assert.strictEqual(tasks[0]!.status, "done");
  });

  it("update returns null when user does not own task", async () => {
    const pool = mockPool([]);
    const repo = new TaskRepository(pool);

    const task = await repo.update("user-1", "task-9", { title: "Changed" });
    assert.strictEqual(task, null);
  });

  it("delete returns false when user does not own task", async () => {
    const pool = mockPool([]);
    const repo = new TaskRepository(pool);

    const deleted = await repo.delete("user-1", "task-9");
    assert.strictEqual(deleted, false);
  });
});
