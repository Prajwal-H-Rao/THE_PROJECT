/**
 * Draft preview page (task 09.8, module 09).
 * Renders DraftPreview with draft data fetched from the API.
 * The preview shows the exact payload that will be sent.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DraftPreview } from "@/components/DraftPreview";
import { fetchDraft, sendDraft } from "@/lib/api-client";
import type { Draft } from "@/lib/api-types";

interface DraftPreviewPageProps {
  params: Promise<{ draftId: string }>;
}

export default async function DraftPreviewPage({
  params,
}: DraftPreviewPageProps) {
  const { draftId } = await params;

  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDraft() {
      try {
        setLoading(true);
        const d = await fetchDraft(draftId);
        setDraft(d);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
        setLoading(false);
      }
    }
    loadDraft();
  }, [draftId]);

  async function handleSend(grantNonce: string) {
    if (!draft) return;
    setLoading(true);
    try {
      await sendDraft(
        draft.draftId,
        grantNonce,
        { to: draft.to, subject: draft.subject, body: draft.body },
        `message:${draft.draftId}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setLoading(false);
    }
  }

  if (loading && !draft) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 p-4">
        <p className="text-lg text-muted-foreground">Loading draft…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 p-4">
        <p className="text-lg text-destructive">{error}</p>
      </main>
    );
  }

  if (!draft) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 p-4">
        <p className="text-lg text-muted-foreground">Draft not found.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 p-4">
      <h1 className="text-4xl font-semibold tracking-tight">Draft Preview</h1>
      <DraftPreview
        draftId={draft.draftId}
        to={draft.to}
        subject={draft.subject}
        body={draft.body}
        onSend={handleSend}
        onCancel={() => {}}
        grantNonce=""
        target={`message:${draft.draftId}`}
        loading={loading}
      />
    </main>
  );
}
