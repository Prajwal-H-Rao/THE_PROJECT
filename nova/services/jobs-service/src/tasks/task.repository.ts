/**
 * Nova design system - Task repository.
 * SQL queries against tasks_reminders_service.tasks table.
 * Provides CRUD operations for tasks with ownership enforcement.
 * Uses pg Pool for database connections.
 */

import { Injectable, Inject } from "@nestjs/common";
import { Pool } from "pg";
import type { Task, CreateTaskInput, UpdateTaskInput, TaskListFilter } from "./task.entity.js";

const TASKS_TABLE = "tasks_reminders_service.tasks";

@Injectable()
export class TaskRepository {
  constructor(@Inject("PG_POOL") private readonly pool: Pool) {}

  /** Create one task for one user. Returns the created task. */
  async create(userId: string, input: CreateTaskInput): Promise<Task> {
    const query = `
      INSERT INTO ${TASKS_TABLE}
        (user_id, title, description, priority, due_at, parent_task_id, recurrence_rule)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING task_id, user_id, title, description, status, priority,
                due_at, parent_task_id, recurrence_rule, created_at, updated_at
    `;
    const values = [
      userId,
      input.title,
      input.description ?? null,
      input.priority ?? 0,
      input.dueAt ?? null,
      input.parentTaskId ?? null,
      input.recurrenceRule ?? null,
    ];
    const result = await this.pool.query(query, values);
    return this.mapRow(result.rows[0]);
  }

  /** Read one task by ID for one user. Returns null if not found. */
  async findById(userId: string, taskId: string): Promise<Task | null> {
    const query = `
      SELECT task_id, user_id, title, description, status, priority,
             due_at, parent_task_id, recurrence_rule, created_at, updated_at
      FROM ${TASKS_TABLE}
      WHERE task_id = $1 AND user_id = $2
    `;
    const result = await this.pool.query(query, [taskId, userId]);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  /** List tasks for one user with optional status/due filter.
   * Ownership enforced: only rows where user_id = $1 are returned.
   */
  async list(userId: string, filter?: TaskListFilter): Promise<Task[]> {
    let query = `
      SELECT task_id, user_id, title, description, status, priority,
             due_at, parent_task_id, recurrence_rule, created_at, updated_at
      FROM ${TASKS_TABLE}
      WHERE user_id = $1
    `;
    const values: unknown[] = [userId];
    let paramIndex = 2;

    if (filter?.status) {
      query += ` AND status = $${paramIndex}`;
      values.push(filter.status);
      paramIndex++;
    }
    if (filter?.dueAt) {
      query += ` AND due_at <= $${paramIndex}`;
      values.push(filter.dueAt);
      paramIndex++;
    }

    query += " ORDER BY updated_at DESC";
    const result = await this.pool.query(query, values);
    return result.rows.map((row) => this.mapRow(row));
  }

  /** Update one task by ID. Returns null if not found. */
  async update(userId: string, taskId: string, input: UpdateTaskInput): Promise<Task | null> {
    const sets: string[] = [];
    const values: unknown[] = [userId, taskId];
    let paramIndex = 3;

    if (input.title !== undefined) {
      sets.push(`title = $${paramIndex}`);
      values.push(input.title);
      paramIndex++;
    }
    if (input.description !== undefined) {
      sets.push(`description = $${paramIndex}`);
      values.push(input.description);
      paramIndex++;
    }
    if (input.status !== undefined) {
      sets.push(`status = $${paramIndex}`);
      values.push(input.status);
      paramIndex++;
    }
    if (input.priority !== undefined) {
      sets.push(`priority = $${paramIndex}`);
      values.push(input.priority);
      paramIndex++;
    }
    if (input.dueAt !== undefined) {
      sets.push(`due_at = $${paramIndex}`);
      values.push(input.dueAt);
      paramIndex++;
    }
    if (input.parentTaskId !== undefined) {
      sets.push(`parent_task_id = $${paramIndex}`);
      values.push(input.parentTaskId);
      paramIndex++;
    }
    if (input.recurrenceRule !== undefined) {
      sets.push(`recurrence_rule = $${paramIndex}`);
      values.push(input.recurrenceRule);
      paramIndex++;
    }

    if (sets.length === 0) {
      return this.findById(userId, taskId);
    }

    sets.push(`updated_at = now()`);
    const query = `
      UPDATE ${TASKS_TABLE}
      SET ${sets.join(", ")}
      WHERE task_id = $2 AND user_id = $1
      RETURNING task_id, user_id, title, description, status, priority,
                due_at, parent_task_id, recurrence_rule, created_at, updated_at
    `;
    const result = await this.pool.query(query, values);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  /** Delete one task by ID. Returns true if deleted, false if not found. */
  async delete(userId: string, taskId: string): Promise<boolean> {
    const query = `
      DELETE FROM ${TASKS_TABLE}
      WHERE task_id = $1 AND user_id = $2
      RETURNING task_id
    `;
    const result = await this.pool.query(query, [taskId, userId]);
    return (result.rowCount ?? 0) > 0;
  }

  /** Map a database row to a Task entity. */
  private mapRow(row: unknown): Task {
    const r = row as Record<string, unknown>;
    return {
      taskId: String(r.task_id),
      userId: String(r.user_id),
      title: String(r.title),
      description: r.description === null ? null : String(r.description),
      status: String(r.status),
      priority: Number(r.priority),
      dueAt: r.due_at === null ? null : String(r.due_at),
      parentTaskId: r.parent_task_id === null ? null : String(r.parent_task_id),
      recurrenceRule:
        r.recurrence_rule === null ? null : String(r.recurrence_rule),
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    };
  }
}
