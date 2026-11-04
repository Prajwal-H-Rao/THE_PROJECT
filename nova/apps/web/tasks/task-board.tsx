/**
 * Nova design system - Task board view.
 * Renders tasks as cards in columns grouped by status.
 * All user-facing text comes from props (no hardcoded text).
 */

"use client";

import * as React from "react";
import { TaskCard } from "@/components/cards/task-card";
import { CardState } from "@/components/ui/card-state";
import type { Task } from "@/lib/api-types";

interface TaskBoardProps {
  tasks: Task[];
}

const STATUS_ORDER = ["open", "in_progress", "done", "cancelled"];

function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function TaskBoard({ tasks }: TaskBoardProps) {
  if (tasks.length === 0) {
    return (
      <CardState state="empty" emptyLabel="No tasks" emptyMessage="No tasks found." />
    );
  }

  const columns = STATUS_ORDER.map((status) => ({
    status,
    items: tasks.filter((t) => t.status === status),
  }));

  return (
    <div className="flex gap-4 overflow-x-auto">
      {columns.map((column) => (
        <div key={column.status} className="min-w-[300px] flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-foreground mb-2">
            {statusLabel(column.status)} ({column.items.length})
          </h3>
          <div className="flex flex-col gap-2">
            {column.items.map((task) => (
              <TaskCard
                key={task.taskId}
                state="default"
                title={task.title}
                due={task.dueAt ?? undefined}
                priority={task.priority === 1 ? "low" : task.priority === 2 ? "medium" : "high"}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
