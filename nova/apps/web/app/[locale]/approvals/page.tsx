/**
 * Approval cards page (task 20.4).
 * Renders inline approval cards with detail view for pending approvals.
 */

"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/shell/shell";
import { CardState } from "@/components/ui/card-state";

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/internal/approvals", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load approvals");
        const data = await res.json();
        if (!cancelled) setApprovals(data);
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
        <CardState state="loading" loadingLabel="Loading approvals" />
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
          <h1 className="text-xl font-semibold text-foreground">Approval Queue</h1>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {approvals.length === 0 ? (
            <p className="text-xs text-muted-foreground">No pending approvals.</p>
          ) : (
            approvals.map((approval) => (
              <div key={approval.id} className="border rounded-lg p-4">
                <h4 className="text-sm font-semibold text-foreground">
                  {approval.title}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {approval.description}
                </p>
                <div className="mt-3 flex gap-2">
                  <button className="px-3 py-1 rounded text-sm border">
                    Approve
                  </button>
                  <button className="px-3 py-1 rounded text-sm border border-red-200 text-red-600 hover:bg-red-50">
                    Reject
                  </button>
                  <button className="px-3 py-1 rounded text-sm border ml-auto">
                    View details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Shell>
  );
}

interface ApprovalItem {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
}
