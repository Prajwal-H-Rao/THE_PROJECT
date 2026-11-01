/**
 * Task service - CRUD operations with ownership enforcement.
 * Cross-user read denied: every operation filters by user_id.
 */

import { Injectable } from "@nestjs/common";
import { TaskRepository } from "./task.repository.js";
import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskListFilter,
} from "./task.entity.js";

export class TaskNotFoundError extends Error {
  constructor(public readonly taskId: string) {
    super(`Task not found: ${taskId}`);
    this.name = "TaskNotFoundError";
  }
}

export class TaskForbiddenError extends Error {
  constructor(public readonly taskId: string) {
    super(`Access denied to task: ${taskId}`);
    this.name = "TaskForbiddenError";
  }
}

@Injectable()
export class TaskService {
  constructor(private readonly repository: TaskRepository) {}

  /** Create one task for one user. Returns the created task. */
  async createTask(userId: string, input: CreateTaskInput): Promise<Task> {
    return this.repository.create(userId, input);
  }

  /** Read one task by ID only if the user owns it.
   * Throws TaskNotFoundError if not found or not owned. */
  async getTask(userId: string, taskId: string): Promise<Task> {
    const task = await this.repository.findById(userId, taskId);
    if (!task) {
      throw new TaskNotFoundError(taskId);
    }
    return task;
  }

  /** List tasks for one user with optional status/due filter.
   * Ownership enforced: only rows where user_id matches are returned. */
  async listTasks(userId: string, filter?: TaskListFilter): Promise<Task[]> {
    return this.repository.list(userId, filter);
  }

  /** Update one task only if the user owns it.
   * Throws TaskNotFoundError if not found or not owned. */
  async updateTask(
    userId: string,
    taskId: string,
    input: UpdateTaskInput
  ): Promise<Task> {
    const task = await this.repository.update(userId, taskId, input);
    if (!task) {
      throw new TaskNotFoundError(taskId);
    }
    return task;
  }

  /** Delete one task only if the user owns it.
   * Throws TaskNotFoundError if not found or not owned. */
  async deleteTask(userId: string, taskId: string): Promise<void> {
    const deleted = await this.repository.delete(userId, taskId);
    if (!deleted) {
      throw new TaskNotFoundError(taskId);
    }
  }
}
