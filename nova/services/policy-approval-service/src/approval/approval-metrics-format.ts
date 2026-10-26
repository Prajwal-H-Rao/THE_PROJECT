/** Prometheus formatting for approval metrics (Task 15). */

import { ApprovalMetrics, MetricPoint } from "./approval-metrics.js";

/** Format metrics as Prometheus text format. */
export function formatPrometheus(metrics: ApprovalMetrics): string {
  const points = metrics.getAll();
  const lines: string[] = [];
  for (const p of points) {
    const labels = Object.entries(p.labels)
      .map(([k, v]) => `${k}="${v.replace(/"/g, '\\"')}"`)
      .join(",");
    lines.push(`${p.name}{${labels}} ${p.value}`);
  }
  return lines.join("\n") + "\n";
}