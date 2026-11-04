/**
 * Nova design system - API types for tasks and notes.
 * Shared TypeScript interfaces for backend API responses.
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

export interface Note {
  readonly noteId: string;
  readonly userId: string;
  readonly title: string;
  readonly content: string | null;
  readonly tags: string[];
  readonly sourceType: string | null;
  readonly sourceRef: string | null;
  readonly isArchived: boolean;
  readonly objectStorePointer: string | null;
  readonly embedding: number[] | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}
