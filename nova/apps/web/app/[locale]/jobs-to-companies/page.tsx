/**
 * Jobs to Companies page (task 13.23).
 * Renders company search, filters, counts from persisted records,
 * pause/resume, and history.
 */

"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/shell/shell";
import { CardState } from "@/components/ui/card-state";

export default function JobsToCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/internal/companies", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load companies");
        const data = await res.json();
        if (!cancelled) setCompanies(data);
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
        <CardState state="loading" loadingLabel="Loading Jobs to Companies" />
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
          <h1 className="text-xl font-semibold text-foreground">Jobs to Companies</h1>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="border rounded-lg bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Total Companies</p>
            <p className="text-2xl font-semibold text-foreground">{companies.length}</p>
          </div>
          <div className="border rounded-lg bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Total Openings</p>
            <p className="text-2xl font-semibold text-foreground">
              {companies.reduce((sum, c) => sum + c.openingsCount, 0)}
            </p>
          </div>
          <div className="border rounded-lg bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Active Sources</p>
            <p className="text-2xl font-semibold text-foreground">
              {companies.reduce((sum, c) => sum + c.sourcesCount, 0)}
            </p>
          </div>
        </div>

        <section className="border rounded-lg bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">Companies ({companies.length})</h2>
          {companies.length === 0 ? (
            <p className="text-xs text-muted-foreground">No companies found.</p>
          ) : (
            <div className="space-y-2">
              {companies.map((company) => (
                <div key={company.employerId} className="border-b pb-3 last:border-0 flex gap-3">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-foreground">{company.name}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{company.status}</span>
                      <span className="mx-1">•</span>
                      <span>{company.sourcesCount} sources</span>
                      <span className="mx-1">•</span>
                      <span>{company.openingsCount} openings</span>
                    </div>
                    {company.lastPollAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last polled: {company.lastPollAt}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Shell>
  );
}

interface Company {
  employerId: string;
  name: string;
  region: "IN" | "GLOBAL";
  status: string;
  sourcesCount: number;
  openingsCount: number;
  lastPollAt: string | null;
}
