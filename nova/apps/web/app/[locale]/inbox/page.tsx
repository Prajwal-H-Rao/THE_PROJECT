/**
 * Nova design system - Inbox page (task 09.18, module 09).
 * Three-pane desktop layout per spec:407: folder/filter rail (~200px),
 * message list (~340px), reading pane. Tablet/mobile switch to list then
 * detail. Each pane keeps its source, freshness and action controls.
 */

"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReadingPane, type InboxMessage } from "./reading-pane";

interface InboxPageProps {
  initialMessages?: InboxMessage[];
}

const FOLDERS = ["inbox", "unread", "archive"] as const;

function freshnessNow(label: string): string {
  return `${label} ${new Date().toLocaleTimeString("en-GB", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function InboxPage({ initialMessages = [] }: InboxPageProps) {
  const [folder, setFolder] = useState<"inbox" | "unread" | "archive">("inbox");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [syncedAt, setSyncedAt] = useState(freshnessNow("Synced"));
  const [listRefreshedAt, setListRefreshedAt] = useState(freshnessNow("Updated"));

  // Work on a mutable copy so mark-as-read / archive toggle domain flags
  // reflected on re-render without external state.
  const messages = useMemo(() => [...initialMessages], [initialMessages]);
  // messagesByFolder recomputes every render so archive/mark-read mutations
  // (stored on the stable `messages` copy) are reflected immediately.
  const messagesByFolder = messages.filter((m) => {
    if (folder === "unread") return m.unread && m.folder === "inbox";
    if (folder === "archive") return m.folder === "archive";
    return m.folder === "inbox";
  });

  const selected = messagesByFolder.find((m) => m.id === selectedId) ?? null;

  const handleMarkRead = () => {
    if (!selected) return;
    setSelectedId(null);
    messages.forEach((m) => { if (m.id === selectedId) m.unread = false; });
  };

  const handleArchive = () => {
    if (!selected) return;
    setSelectedId(null);
    messages.forEach((m) => { if (m.id === selectedId) m.folder = "archive"; });
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-col lg:flex-row gap-1">
        {/* Rail (~200px): folders + source + freshness + refresh action. */}
        <aside className="hidden lg:flex lg:flex-col lg:w-[200px] shrink-0 gap-3 border-r border-border p-3">
          <div className="flex flex-col gap-2 mb-3">
            <span className="text-xs font-semibold text-muted-foreground">Folders</span>
            {FOLDERS.map((name) => (
              <Button
                key={name}
                variant={folder === name ? "default" : "outline"}
                size="sm"
                onClick={() => setFolder(name)}
                className="w-full justify-start text-sm"
              >
                {`Folder: ${name.charAt(0).toUpperCase() + name.slice(1)}`}
              </Button>
            ))}
          </div>
          <div className="flex flex-col gap-1 pt-2">
            <span data-testid="rail-source" className="text-xs font-medium text-muted-foreground">
              Source: Gmail
            </span>
            <span data-testid="rail-freshness" className="text-xs text-muted-foreground">
              {syncedAt}
            </span>
            <Button
              size="sm"
              onClick={() => setSyncedAt(freshnessNow("Synced"))}
              className="w-full justify-start text-xs mt-2"
            >
              Refresh sync
            </Button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Message list (~340px): rows + its own freshness + refresh action.
              Below lg it hides when a message is open (list then detail);
              at lg+ it always shows (three-pane). */}
          <section
            className={[
              "flex-1 flex flex-col border-r border-border overflow-hidden shrink-0",
              selected ? "hidden lg:flex" : "",
            ].join(" ").trim()}
          >
            <div className="flex items-center justify-between border-b border-border p-2 bg-muted/20 shrink-0">
              <h2 className="text-sm font-semibold text-foreground">
                {folder.charAt(0).toUpperCase() + folder.slice(1)}
              </h2>
              <span data-testid="list-freshness" className="text-xs text-muted-foreground">
                {listRefreshedAt}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 gap-2">
              {messagesByFolder.length === 0 ? (
                <div
                  data-testid="message-list"
                  className="flex flex-col items-center justify-center py-8 text-muted-foreground"
                >
                  No messages
                </div>
              ) : (
                <div data-testid="message-list" className="flex flex-col gap-2">
                  {messagesByFolder.map((message) => (
                    <button
                      key={message.id}
                      type="button"
                      data-testid={`message-${message.id}`}
                      onClick={() => setSelectedId(message.id)}
                      className={[
                        "cursor-pointer rounded border border-border p-2 text-left",
                        message.unread ? "bg-blue-50 border-blue-100" : "bg-muted/50",
                      ].join(" ")}
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-foreground">
                          {message.subject}
                        </span>
                        <span className="text-xs text-muted-foreground">{message.sender}</span>
                        <span className="text-xs text-muted-foreground">
              {message.receivedAt ? message.receivedAt.slice(5, 10) : "--"}
            </span>
                      </div>
                      {message.unread && (
                        <Badge variant="warning" size="xs">Unread</Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-border p-1 shrink-0">
              <Button
                size="sm"
                onClick={() => setListRefreshedAt(freshnessNow("Updated"))}
                className="w-full justify-start text-xs"
              >
                Refresh list
              </Button>
            </div>
          </section>

          {/* Reading pane: below lg it stacks after the list when selected;
              at lg+ it sits side by side with the list (three-pane). */}
          {selected && (
            <ReadingPane
              message={selected}
              folderSource="Gmail"
              onMarkRead={handleMarkRead}
              onArchive={handleArchive}
              onBack={() => setSelectedId(null)}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default InboxPage;
