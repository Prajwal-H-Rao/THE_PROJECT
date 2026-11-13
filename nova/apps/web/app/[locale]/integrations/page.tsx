/**
 * Integrations page (task 20.13).
 * Builds the Integrations page from integration-registry: status, scopes,
 * last sync, reconnect, revoke.
 */

"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/shell/shell";
import { CardState } from "@/components/ui/card-state";

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/internal/integrations", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load integrations");
        const data = await res.json();
        if (!cancelled) setIntegrations(data);
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
        <CardState state="loading" loadingLabel="Loading Integrations" />
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
          <h1 className="text-xl font-semibold text-foreground">Integrations</h1>
        </div>

        <section className="border rounded-lg bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">Connected Integrations ({integrations.length})</h2>
          {integrations.length === 0 ? (
            <p className="text-xs text-muted-foreground">No integrations configured.</p>
          ) : (
            <div className="space-y-2">
              {integrations.map((integration) => (
                <div key={integration.integrationId} className="border-b pb-3 flex flex-col gap-2 last:border-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-foreground">{integration.name}</h4>
                    <span className="text-xs font-medium px-2 py-1 rounded {integration.status === 'connected' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">{integration.status}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{integration.provider}</span>
                    <span className="mx-1">•</span>
                    <span>Last sync: {integration.lastSync || "Never"}</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button className="px-3 py-1 rounded text-sm border">Reconnect</button>
                    <button className="px-3 py-1 rounded text-sm border border-red-200 text-red-600 hover:bg-red-50">Revoke</button>
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

interface Integration {
  integrationId: string;
  name: string;
  provider: string;
  status: string;
  lastSync: string | null;
}
