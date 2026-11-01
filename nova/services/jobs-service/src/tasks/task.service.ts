/**
 * Nova design system - Task service.
 * CRUD operations for tasks with ownership enforcement.
 * All operations filter by user_id to ensure data isolation.
 */

import { Injectable } from "@nestjs/common";
import { TaskRepository } from "./task.repository.js";
import type { Task, CreateTaskInput, UpdateTaskInput, TaskListFilter } from "./task.entity.js";

export class TaskNotFoundError extends Error {
  constructor(public readonly taskId: string) {
    super(`Task not found: ${taskId}`);
    this.name = "TaskNotFoundError";
  }
}

@Injectable()
export class TaskService {
  constructor(private readonly repository: TaskRepository) {}

  /** Create one task for one user. Returns the created task. */
  async createTask(userId: string, input: CreateTaskInput): Promise<Task> {
    return this.repository.create(userId, input);
  }

  /** Read one task by ID for one user. Returns null if not found. */
  async getTask(userId: string, taskId: string): Promise<Task | null> {
    return this.repository.findById(userId, taskId);
  }

  /** List tasks for one user with optional status/due filter. */
  async listTasks(userId: string, filter?: TaskListFilter): Promise<Task[]> {
    return this.repository.list(userId, filter);
  }

  /** Update one task by ID. Returns null if not found. */
  async updateTask(
    userId: string,
    taskId: string,
    input: UpdateTaskInput,
  ): Promise<Task | null> {
    return this.repository.update(userId, taskId, input);
  }

  /** Delete one task by ID. Returns true if deleted, false if not found. */
  async deleteTask(userId: string, taskId: string): Promise<boolean> {
    return this.repository.delete(userId, taskId);
  }
}
