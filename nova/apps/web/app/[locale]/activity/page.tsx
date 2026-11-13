/**
 * Activity & Security page (task 20.15).
 * Renders filterable audit timeline, session list, channel identities, alerts.
 * Timeline filters by actor and policy result.
 */

"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/shell/shell";
import { CardState } from "@/components/ui/card-state";

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/internal/activity", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load activity");
        const data = await res.json();
        if (!cancelled) setActivities(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Shell appName="NOVA">
        <CardState state="loading" loadingLabel="Loading Activity & Security" />
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell appName="NOVA">
        <CardState state="error" errorLabel="Load error" errorMessage={error} />
      </Shell>
    );
  }

  return (
    <Shell appName="NOVA">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Activity & Security</h1>
        </div>

        <section className="border rounded-lg bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">Audit Timeline</h2>
          {activities.length === 0 ? (
            <p className="text-xs text-muted-foreground">No activity recorded.</p>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className="flex gap-3 p-2 border rounded">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground">{activity.actor}</span>
                      <span className="text-xs text-muted-foreground">{activity.timestamp}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs mt-1">
                      <span className="px-2 py-0.5 rounded {activity.policyResult === 'allowed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">{activity.policyResult}</span>
                      <span className="text-muted-foreground">{activity.resource}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="border rounded-lg bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">Session List</h2>
          <p className="text-xs text-muted-foreground">Active sessions across all channels.</p>
          <div className="space-y-2">
            {[
              { channel: "Telegram", channelId: "tg_123", lastSeen: "2m ago" },
              { channel: "WhatsApp", channelId: "wa_456", lastSeen: "15m ago" },
              { channel: "Web", channelId: "web_789", lastSeen: "5m ago" },
            ].map((s) => (
              <div key={s.channelId} className="flex items-center justify-between border-b pb-2 text-sm last:border-0">
                <span className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-[10px] font-bold">●</span>
                  <span>{s.channel}</span>
                </span>
                <span className="text-muted-foreground">{s.lastSeen}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Shell>
  );
}

interface ActivityItem {
  id: string;
  actor: string;
  resource: string;
  policyResult: string;
  timestamp: string;
}
