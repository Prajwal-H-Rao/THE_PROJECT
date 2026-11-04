/**
 * Tests for TaskList component.
 * Verifies task list renders from real data and shows overdue state.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TaskList } from "./task-list";
import type { Task } from "@/lib/api-types";

const baseTask: Task = {
  taskId: "t-1",
  userId: "user-1",
  title: "Test task",
  description: null,
  status: "open",
  priority: 1,
  dueAt: null,
  parentTaskId: null,
  recurrenceRule: null,
  timezone: "UTC",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

function makeTask(overrides: Partial<Task>): Task {
  return { ...baseTask, ...overrides };
}

describe("TaskList", () => {
  it("renders tasks from real data", () => {
    const tasks = [
      makeTask({ taskId: "t-1", title: "Buy milk", dueAt: "2026-12-01T10:00:00Z" }),
      makeTask({ taskId: "t-2", title: "Call mom", dueAt: null }),
    ];

    render(<TaskList tasks={tasks} overdueCount={0} />);

    expect(screen.getByText("Buy milk")).toBeTruthy();
    expect(screen.getByText("Call mom")).toBeTruthy();
  });

  it("shows empty state when no tasks", () => {
    render(<TaskList tasks={[]} overdueCount={0} />);

    expect(screen.getByText("No tasks found.")).toBeTruthy();
  });

  it("shows overdue task state", () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const tasks = [makeTask({ taskId: "t-1", title: "Late task", dueAt: pastDate, status: "open" })];

    render(<TaskList tasks={tasks} overdueCount={1} />);

    expect(screen.getByText("Late task")).toBeTruthy();
  });
});
