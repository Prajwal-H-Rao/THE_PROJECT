/**
 * Task 20.14 — Settings page with token-expiry and error explanations.
 * Renders profile, timezone, locale, appearance, retention, model selection,
 * notifications, 2FA, export, delete. Includes token expiry warnings and
 * error explanations for each section.
 */

"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/shell/shell";
import { CardState } from "@/components/ui/card-state";

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/internal/settings", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load settings");
        const data = await res.json();
        if (!cancelled) setSettings(data);
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
        <CardState state="loading" loadingLabel="Loading Settings" />
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
          <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {settings.map((setting) => (
            <div key={setting.id} className="border rounded-lg bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    {setting.name}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {setting.description}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {setting.type === "toggle" ? (
                    <button
                      className="px-3 py-1 rounded text-sm border"
                      onClick={() => {}}
                    >
                      {setting.value === "true" ? "On" : "Off"}
                    </button>
                  ) : (
                    <input
                      type={setting.type}
                      className="px-3 py-1 rounded text-sm border"
                      defaultValue={setting.value as string}
                      readOnly={setting.readonly}
                    />
                  )}
                </div>
              </div>
              {setting.expiryWarning && (
                <p className="mt-2 text-xs text-amber-600 font-medium">
                  ⚠ Token expires: {setting.expiryWarning}
                </p>
              )}
              {setting.errorExplanation && (
                <div className="mt-2 mt-2 p-2 rounded bg-amber-50 text-sm text-amber-800 border border-amber-200">
                  {setting.errorExplanation}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

interface SettingsItem {
  id: string;
  name: string;
  description: string;
  type: "text" | "number" | "select" | "toggle";
  value: string | number | boolean;
  readonly: boolean;
  expiryWarning?: string;
  errorExplanation?: string;
}
