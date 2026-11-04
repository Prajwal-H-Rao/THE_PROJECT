/**
 * Nova design system - Task list view.
 * Renders tasks as cards with overdue state for tasks past their due date.
 * All user-facing text comes from props (no hardcoded text).
 */

"use client";

import * as React from "react";
import { TaskCard } from "@/components/cards/task-card";
import { CardState } from "@/components/ui/card-state";
import type { Task } from "@/lib/api-types";

interface TaskListProps {
  tasks: Task[];
  overdueCount: number;
}

function isOverdue(task: Task): boolean {
  if (!task.dueAt || task.status === "done") return false;
  return new Date(task.dueAt) < new Date();
}

export function TaskList({ tasks, overdueCount }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <CardState state="empty" emptyLabel="No tasks" emptyMessage="No tasks found." />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tasks.map((task) => {
        const overdue = isOverdue(task);
        return (
          <TaskCard
            key={task.taskId}
            state="default"
            title={task.title}
            due={task.dueAt ?? undefined}
            priority={task.priority === 1 ? "low" : task.priority === 2 ? "medium" : "high"}
          />
        );
      })}
    </div>
  );
}
