/**
 * Nova design system - Tasks and Notes page.
 * Main page for the Tasks and Notes domain. Renders list, board, calendar
 * and notes views from real data fetched via the API client.
 * Shows overdue task state for tasks past their due date.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/shell/shell";
import { CardState } from "@/components/ui/card-state";
import { cn } from "@/lib/utils";
import { TaskList } from "@/tasks/task-list";
import { TaskBoard } from "@/tasks/task-board";
import { NoteList } from "@/tasks/note-list";
import { CalendarView } from "@/tasks/calendar-view";
import { fetchTasks, fetchNotes } from "@/lib/api-client";
import type { Task, Note } from "@/lib/api-types";

type Tab = "list" | "board" | "calendar" | "notes";

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("list");

  const navItems = [
    { label: "Tasks", href: "/tasks" },
  ];

  const handleItemClick = (item: { label: string; href: string }) => {
    router.push(item.href);
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const [t, n] = await Promise.all([fetchTasks(), fetchNotes()]);
        if (!cancelled) {
          setTasks(t);
          setNotes(n);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Shell appName="NOVA" navItems={navItems} onItemClick={handleItemClick}>
        <CardState state="loading" loadingLabel="Loading tasks and notes" />
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell appName="NOVA" navItems={navItems} onItemClick={handleItemClick}>
        <CardState state="error" errorLabel="Load error" errorMessage={error} />
      </Shell>
    );
  }

  const overdueCount = tasks.filter(
    (t) => t.dueAt && new Date(t.dueAt) < new Date() && t.status !== "done"
  ).length;

  return (
    <Shell appName="NOVA">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Tasks &amp; Notes</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab("list")}
            className={cn(
              "px-3 py-1 rounded text-sm",
              tab === "list" ? "bg-background" : "bg-muted text-muted-foreground"
            )}
          >
            List
          </button>
          <button
            onClick={() => setTab("board")}
            className={cn(
              "px-3 py-1 rounded text-sm",
              tab === "board" ? "bg-background" : "bg-muted text-muted-foreground"
            )}
          >
            Board
          </button>
          <button
            onClick={() => setTab("calendar")}
            className={cn(
              "px-3 py-1 rounded text-sm",
              tab === "calendar" ? "bg-background" : "bg-muted text-muted-foreground"
            )}
          >
            Calendar
          </button>
          <button
            onClick={() => setTab("notes")}
            className={cn(
              "px-3 py-1 rounded text-sm",
              tab === "notes" ? "bg-background" : "bg-muted text-muted-foreground"
            )}
          >
            Notes
          </button>
        </div>
        {tab === "list" && <TaskList tasks={tasks} overdueCount={overdueCount} />}
        {tab === "board" && <TaskBoard tasks={tasks} />}
        {tab === "calendar" && <CalendarView tasks={tasks} />}
        {tab === "notes" && <NoteList notes={notes} />}
      </div>
    </Shell>
  );
}
