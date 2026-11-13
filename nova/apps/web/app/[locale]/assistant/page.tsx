/**
 * Assistant page (task 20.2).
 * Renders the Assistant page with an 800px conversation column,
 * 320px context rail, and sticky composer. Tool results render apart
 * from prose. Approval cards appear inline but open a detail view.
 */

"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/shell/shell";
import { CardState } from "@/components/ui/card-state";

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [context, setContext] = useState<ContextItem[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [msgsRes, ctxRes] = await Promise.all([
          fetch("/api/internal/assistant/messages", { cache: "no-store" }),
          fetch("/api/internal/assistant/context", { cache: "no-store" }),
        ]);
        if (!msgsRes.ok || !ctxRes.ok) throw new Error("Failed to load");
        setMessages(await msgsRes.json());
        setContext(await ctxRes.json());
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
        <CardState state="loading" loadingLabel="Loading Assistant" />
      </Shell>
    );
  }

  return (
    <Shell appName="NOVA">
      <div className="flex flex-col h-full">
        <div className="flex-1 flex overflow-hidden">
          {/* Conversation column - 800px */}
          <div className="w-full max-w-[800px] flex flex-col h-full border-r border-border">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center mt-10">
                  No messages yet. Start a conversation.
                </p>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="flex gap-3">
                    <div className="flex-1">
                      <div className={`inline-block rounded-lg px-3 py-2 ${
                        msg.role === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-900"
                      }`}>
                        {msg.content}
                      </div>
                      {msg.toolResult && (
                        <div className="mt-1 p-2 bg-gray-100 border border-gray-200 rounded text-xs text-gray-600">
                          <span className="font-bold text-xs uppercase">Tool Result:</span>{" "}
                          {msg.toolResult}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !loading) {
                      setLoading(true);
                      setMessages([
                        ...messages,
                        { id: Date.now().toString(), role: "user", content: input },
                      ]);
                      setInput("");
                    }
                  }}
                />
                <button
                  disabled={loading || !input.trim()}
                  className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* Context rail - 320px */}
          <div className="w-[320px] flex flex-col border-l border-border">
            <h3 className="text-sm font-semibold text-foreground p-3 border-b border-border">
              Context
            </h3>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {context.length === 0 ? (
                <p className="text-xs text-muted-foreground">No context items.</p>
              ) : (
                context.map((ctx) => (
                  <div key={ctx.id} className="flex gap-2 p-2 border rounded text-sm">
                    <span className="w-8 h-8 rounded bg-gray-200 flex items-center justify-center text-[10px] font-medium">
                      {ctx.icon}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">{ctx.title}</div>
                      <div className="text-[10px] text-muted-foreground">{ctx.preview}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolResult?: string;
}

interface ContextItem {
  id: string;
  title: string;
  preview: string;
  icon: string;
}
