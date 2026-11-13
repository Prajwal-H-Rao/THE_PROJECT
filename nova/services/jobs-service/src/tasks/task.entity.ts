/**
 * Nova design system - Job entity.
 * Represents one user-owned job (recurring task).
 */

export interface Job {
  readonly jobId: string;
  readonly userId: string;
  readonly title: string;
  readonly description: string | null;
  readonly status: string;
  readonly priority: number;
  readonly dueAt: string | null;
  readonly recurrenceRule: string | null;
  readonly timezone: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateJobInput {
  readonly title: string;
  readonly description?: string;
  readonly priority?: number;
  readonly dueAt?: string;
  readonly parentTaskId?: string;
  readonly recurrenceRule?: string;
  readonly timezone?: string;
}

export interface UpdateJobInput {
  readonly title?: string;
  readonly description?: string | null;
  readonly status?: string;
  readonly priority?: number;
  readonly dueAt?: string | null;
  readonly parentTaskId?: string | null;
  readonly recurrenceRule?: string;
  readonly timezone?: string;
}

/** The alias names the repository and the service import. They predate the Job naming. */
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
  readonly createdAt: string;
  readonly updatedAt: string;
}
export type CreateTaskInput = CreateJobInput;
export type UpdateTaskInput = UpdateJobInput;

/** The list filter the repository applies. */
export interface TaskListFilter {
  readonly status?: string;
  readonly dueAt?: string;
}

export interface JobListFilter {
  status?: string;
  dueAt?: string;
}
