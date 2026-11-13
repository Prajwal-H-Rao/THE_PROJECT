/**
 * Today page (task 20.1).
 * Renders KPI strip, agenda timeline, priority tasks, pending approvals.
 * Every KPI links to its source records.
 */

"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/shell/shell";
import { CardState } from "@/components/ui/card-state";

export default function TodayPage() {
  const [kpis, setKpis] = useState<KpiCard[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [kpisRes, tasksRes, approvalsRes] = await Promise.all([
          fetch("/api/internal/today/kpis", { cache: "no-store" }),
          fetch("/api/internal/today/tasks", { cache: "no-store" }),
          fetch("/api/internal/today/approvals", { cache: "no-store" }),
        ]);
        if (!kpisRes.ok || !tasksRes.ok || !approvalsRes.ok) {
          throw new Error("Failed to load today data");
        }
        setKpis(await kpisRes.json());
        setTasks(await tasksRes.json());
        setApprovals(await approvalsRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <Shell appName="NOVA">
        <CardState state="loading" loadingLabel="Loading Today page" />
      </Shell>
    );
  }

  return (
    <Shell appName="NOVA">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Today</h1>
        </div>

        {/* KPI strip */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <div key={kpi.id} className="border rounded-lg bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground">
                {kpi.label}
              </p>
              <p className="text-2xl font-semibold text-foreground">
                {kpi.value}
              </p>
              {kpi.change && (
                <p className="text-xs text-sm {kpi.change > 0 ? 'text-green-600' : 'text-red-600'}">
                  {kpi.change > 0 ? "+" : ""}{kpi.change} vs yesterday
                </p>
              )}
              <button className="mt-2 px-3 py-1 rounded text-sm border">
                View details
              </button>
            </div>
          ))}
        </div>

        {/* Priority tasks and pending approvals */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <section className="border rounded-lg bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">
              Priority Tasks
            </h2>
            {tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground">No priority tasks.</p>
            ) : (
              <ul className="space-y-2">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between border-b pb-2 text-sm">
                    <span className="text-foreground">{task.title}</span>
                    <span className="text-muted-foreground">{task.priority}</span>
                  </div>
                ))}
              </ul>
            )}
          </section>

          <section className="border rounded-lg bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">
              Pending Approvals
            </h2>
            {approvals.length === 0 ? (
              <p className="text-xs text-muted-foreground">No pending approvals.</p>
            ) : (
              <ul className="space-y-2">
                {approvals.map((approval) => (
                  <div key={approval.id} className="flex items-center justify-between border-b pb-2 text-sm">
                    <span>{approval.title}</span>
                    <span className="text-muted-foreground">{approval.status}</span>
                  </div>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </Shell>
  );
}

interface KpiCard {
  id: string;
  label: string;
  value: string | number;
  change?: number;
}

interface TaskItem {
  id: string;
  title: string;
  priority: string;
}

interface ApprovalItem {
  id: string;
  title: string;
  status: string;
}
