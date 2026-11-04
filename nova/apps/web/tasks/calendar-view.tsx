/**
 * Nova design system - Calendar view.
 * Renders tasks grouped by due date in a simple calendar layout.
 * All user-facing text comes from props (no hardcoded text).
 */

"use client";

import * as React from "react";
import { CardState } from "@/components/ui/card-state";
import type { Task } from "@/lib/api-types";

interface CalendarViewProps {
  tasks: Task[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function groupByDueDate(tasks: Task[]): Record<string, Task[]> {
  const groups: Record<string, Task[]> = {};
  for (const task of tasks) {
    if (!task.dueAt) continue;
    const dateKey = new Date(task.dueAt).toDateString();
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(task);
  }
  return groups;
}

export function CalendarView({ tasks }: CalendarViewProps) {
  const withDueDate = tasks.filter((t) => t.dueAt);
  if (withDueDate.length === 0) {
    return (
      <CardState state="empty" emptyLabel="No scheduled tasks" emptyMessage="No tasks with due dates." />
    );
  }

  const groups = groupByDueDate(withDueDate);
  const sortedDates = Object.keys(groups).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  return (
    <div className="space-y-4">
      {sortedDates.map((dateKey) => {
        const date = new Date(dateKey);
        const isOverdue = date < new Date(new Date().setHours(0, 0, 0, 0));
        const dayTasks = groups[dateKey];
        return (
          <div key={dateKey} className="border border-border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-foreground">
                {formatDate(dateKey)}
              </h3>
              {isOverdue && (
                <span className="text-xs text-destructive font-medium">Overdue</span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              {dayTasks.map((task) => (
                <div key={task.taskId} className="px-2 py-1 rounded bg-muted/50 text-sm">
                  {task.title}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
