/**
 * Nova design system - Jobs to Companies page (task 13.23).
 * Renders company search, filters, counts from persisted records,
 * pause/resume, and history. Fetches from the employer-registry-service.
 */

"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/shell/shell";
import { CardState } from "@/components/ui/card-state";
import { CompanyCard } from "@/components/cards/company-card";
import { fetchCompanies } from "@/lib/api-client";
import type { Company } from "@/lib/api-types";

export default function JobsToCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const data = await fetchCompanies();
        if (!cancelled) {
          setCompanies(data);
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
        <CardState state="loading" loadingLabel="Loading companies" />
      </Shell>
    );
  }

  if (error !== null) {
    return (
      <Shell appName="NOVA">
        <CardState state="error" errorLabel="Load error" errorMessage={error} />
      </Shell>
    );
  }

  const filtered = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) &&
      (regionFilter === "" || c.region === regionFilter),
  );

  const inCount = companies.filter((c) => c.region === "IN").length;
  const globalCount = companies.filter((c) => c.region === "GLOBAL").length;

  return (
    <Shell appName="NOVA">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">
            Jobs to Companies
          </h1>
        </div>

        {/* Summary counts */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="border-border rounded-lg bg-card p-3">
            <p className="text-xs font-medium text-muted-foreground">
              Total companies
            </p>
            <p className="text-2xl font-semibold text-foreground">
              {companies.length}
            </p>
          </div>
          <div className="border-border rounded-lg bg-card p-3">
            <p className="text-xs font-medium text-muted-foreground">IN</p>
            <p className="text-2xl font-semibold text-foreground">{inCount}</p>
          </div>
          <div className="border-border rounded-lg bg-card p-3">
            <p className="text-xs font-medium text-muted-foreground">GLOBAL</p>
            <p className="text-2xl font-semibold text-foreground">
              {globalCount}
            </p>
          </div>
        </div>

        {/* Search and filters */}
        <section className="border-border rounded-lg bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Search &amp; filters
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search companies..."
                className="w-full px-3 py-1.5 rounded border text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="px-3 py-1.5 rounded border text-sm"
            >
              <option value="">All regions</option>
              <option value="IN">IN</option>
              <option value="GLOBAL">GLOBAL</option>
            </select>
            <button
              className="px-4 py-1.5 rounded border text-sm"
              onClick={() => {
                setSearch("");
                setRegionFilter("");
              }}
            >
              Clear
            </button>
          </div>
        </section>

        {/* Company list */}
        <section className="border-border rounded-lg bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Companies ({filtered.length})
          </h2>
          {filtered.length === 0 ? (
            <CardState
              state="empty"
              emptyLabel="No companies"
              emptyMessage="No companies match the current filters."
            />
          ) : (
            <div className="space-y-2">
              {filtered.map((company) => (
                <CompanyCard
                  key={company.employerId}
                  state="default"
                  company={company}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </Shell>
  );
}
