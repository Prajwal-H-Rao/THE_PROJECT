/**
 * Channel settings page (task 14.19).
 * Renders channel settings: link, unlink, mute, opt-out for connected channels.
 */

"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/shell/shell";
import { CardState } from "@/components/ui/card-state";

export default function ChannelSettingsPage() {
  const [channels, setChannels] = useState<ChannelSetting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/internal/channels", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load channels");
        const data = await res.json();
        setChannels(data);
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
        <CardState state="loading" loadingLabel="Loading channel settings" />
      </Shell>
    );
  }

  return (
    <Shell appName="NOVA">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Channel Settings</h1>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {channels.map((channel) => (
            <div key={channel.channelId} className="border rounded-lg p-4">
              <h4 className="text-sm font-semibold text-foreground">
                {channel.channelName}
              </h4>
              <p className="text-xs text-muted-foreground">
                Status: {channel.status}
              </p>
              <div className="mt-3 flex gap-2">
                <button className="px-3 py-1 rounded text-sm border" disabled>
                  {channel.isLinked ? "Unlink" : "Link"}
                </button>
                <button
                  className="px-3 py-1 rounded text-sm border"
                  disabled={!channel.isLinked}
                >
                  {channel.isMuted ? "Unmute" : "Mute"}
                </button>
                <button
                  className="px-3 py-1 rounded text-sm border"
                  disabled={!channel.isLinked}
                >
                  Opt-out
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

interface ChannelSetting {
  channelId: string;
  channelName: string;
  region: string;
  status: string;
  isLinked: boolean;
  isMuted: boolean;
  lastPollAt: string | null;
}
