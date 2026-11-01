/**
 * Task entity - represents one user-owned task.
 * All fields are read-only after creation except status updates.
 */

export interface Task {
  readonly taskId: string;
  readonly userId: string;
  readonly title: string;
  readonly description: string | null;
  readonly status: string;
  readonly priority: number;
  readonly dueAt: string | null;
  readonly parentTaskId: string | null;
  readonly recurrenceRule: string | null;
  readonly timezone: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateTaskInput {
  readonly title: string;
  readonly description?: string;
  readonly priority?: number;
  readonly dueAt?: string;
  readonly parentTaskId?: string;
  readonly recurrenceRule?: string;
  readonly timezone?: string;
}

export interface UpdateTaskInput {
  readonly title?: string;
  readonly description?: string | null;
  readonly status?: string;
  readonly priority?: number;
  readonly dueAt?: string | null;
  readonly parentTaskId?: string | null;
  readonly recurrenceRule?: string;
  readonly timezone?: string;
}

export interface TaskListFilter {
  status?: string;
  dueAt?: string;
}
