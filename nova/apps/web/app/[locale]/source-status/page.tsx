/**
 * Nova design system - Source-status surface page (task 13.20).
 * Renders source status per source: verified, stale, failed, rate-limited,
 * manual, unsupported, paused — each with a reason.
 * Fetches from the employer-registry-service backend.
 */

"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/shell/shell";
import { CardState } from "@/components/ui/card-state";
import { SourceStatusCard } from "@/components/cards/source-status-card";
import { fetchSourceStatus } from "@/lib/api-client";
import type { SourceStatus } from "@/lib/api-types";

export default function SourceStatusPage() {
  const [sources, setSources] = useState<SourceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const data = await fetchSourceStatus();
        if (!cancelled) {
          setSources(data);
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
      <Shell appName="NOVA">
        <CardState state="loading" loadingLabel="Loading source status" />
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

  const byStatus = sources.reduce(
    (acc, s) => {
      acc[s.status] = (acc[s.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <Shell appName="NOVA">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">
            Source Status
          </h1>
        </div>

        {/* Status summary */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { key: "verified", label: "Verified" },
            { key: "stale", label: "Stale" },
            { key: "failed", label: "Failed" },
            { key: "rate-limited", label: "Rate-limited" },
            { key: "manual", label: "Manual" },
            { key: "unsupported", label: "Unsupported" },
            { key: "paused", label: "Paused" },
          ].map((entry) => (
            <div
              key={entry.key}
              className="border-border rounded-lg bg-card p-3"
            >
              <p className="text-xs font-medium text-muted-foreground">
                {entry.label}
              </p>
              <p className="text-2xl font-semibold text-foreground">
                {byStatus[entry.key] ?? 0}
              </p>
            </div>
          ))}
        </div>

        {/* Source list */}
        <section className="border-border rounded-lg bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Source status detail
          </h2>
          {sources.length === 0 ? (
            <CardState
              state="empty"
              emptyLabel="No sources"
              emptyMessage="No source status data available."
            />
          ) : (
            <div className="space-y-2">
              {sources.map((source) => (
                <SourceStatusCard
                  key={source.sourceId}
                  state="default"
                  source={source}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </Shell>
  );
}
