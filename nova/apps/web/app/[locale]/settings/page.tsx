/**
 * Settings page (task 20.16).
 * Profile, timezone, locale, appearance, retention, model selection,
 * notifications, 2FA, export, delete.
 */

"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/shell/shell";
import { CardState } from "@/components/ui/card-state";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/internal/settings", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load settings");
        setSettings(await res.json());
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
        <CardState state="loading" loadingLabel="Loading Settings" />
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
              <h4 className="text-sm font-semibold text-foreground">
                {setting.name}
              </h4>
              <p className="text-xs text-muted-foreground">
                {setting.description}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <input
                  type={setting.type}
                  className="px-3 py-1 rounded text-sm border"
                  defaultValue={setting.value}
                  disabled={setting.readonly}
                />
                <button
                  className="px-3 py-1 rounded text-sm border"
                  disabled={setting.readonly}
                >
                  Save
                </button>
              </div>
            </div>
          ))}
        </div>

        <section className="border rounded-lg bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Account Management
          </h2>
          <div className="space-y-3">
            <button className="px-4 py-2 rounded text-sm border">
              Export My Data
            </button>
            <button
              className="px-4 py-2 rounded text-sm border border-red-200 text-red-600 hover:bg-red-50"
            >
              Delete My Account
            </button>
          </div>
        </section>
      </div>
    </Shell>
  );
}

interface Settings {
  id: string;
  name: string;
  description: string;
  type: "text" | "number" | "select" | "toggle";
  value: string | number | boolean;
  readonly: boolean;
}
