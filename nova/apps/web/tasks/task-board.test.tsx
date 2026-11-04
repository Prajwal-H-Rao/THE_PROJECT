/**
 * Tests for TaskBoard component.
 * Verifies board view renders tasks grouped by status from real data.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TaskBoard } from "./task-board";
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

describe("TaskBoard", () => {
  it("renders tasks grouped by status from real data", () => {
    const tasks = [
      makeTask({ taskId: "t-1", title: "Open task", status: "open" }),
      makeTask({ taskId: "t-2", title: "In progress task", status: "in_progress" }),
      makeTask({ taskId: "t-3", title: "Done task", status: "done" }),
    ];

    render(<TaskBoard tasks={tasks} />);

    expect(screen.getByText(/Open \(\d+\)/)).toBeTruthy();
    expect(screen.getByText(/In_progress \(\d+\)/)).toBeTruthy();
    expect(screen.getByText(/Done \(\d+\)/)).toBeTruthy();
    expect(screen.getByText("Open task")).toBeTruthy();
    expect(screen.getByText("In progress task")).toBeTruthy();
    expect(screen.getByText("Done task")).toBeTruthy();
  });

  it("shows empty state when no tasks", () => {
    render(<TaskBoard tasks={[]} />);

    expect(screen.getByText("No tasks found.")).toBeTruthy();
  });
});
