/**
 * Tests for CalendarView component.
 * Verifies calendar view renders tasks grouped by due date from real data.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CalendarView } from "./calendar-view";
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

describe("CalendarView", () => {
  it("renders tasks grouped by due date from real data", () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const tasks = [
      makeTask({ taskId: "t-1", title: "Future task", dueAt: futureDate }),
    ];

    render(<CalendarView tasks={tasks} />);

    expect(screen.getByText("Future task")).toBeTruthy();
  });

  it("shows empty state when no tasks with due dates", () => {
    const tasks = [
      makeTask({ taskId: "t-1", title: "No due date", dueAt: null }),
    ];

    render(<CalendarView tasks={tasks} />);

    expect(screen.getByText("No tasks with due dates.")).toBeTruthy();
  });
});
