/** Action preview page (task 15.17, P4). Renders ActionPreview with mock data
 * so the sign-in / approval-rejection e2e flows can exercise it.
 */

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ActionPreview } from "@/components/ActionPreview";

const mockProps = {
  tool: "transfer_funds",
  arguments: { amount: 100.0, to: "acct-2" },
  permissions: ["documents.write", "finance.transfer"],
  sideEffects: ["Money leaves account", "Transaction is logged"],
  reversible: true,
  expiry: new Date("2026-12-01T00:00:00Z"),
  rationale: "Transfer within verified policy limits.",
};

export default function ActionPreviewPage() {
  const [outcome, setOutcome] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const expired = searchParams.get("expired") === "true";

  // Expired state takes precedence.
  if (expired) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 p-4">
        <h1 className="text-4xl font-semibold tracking-tight">Action Preview</h1>
        <p className="text-lg text-danger">Expired</p>
      </main>
    );
  }

  if (outcome === "approved") {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 p-4">
        <h1 className="text-4xl font-semibold tracking-tight">Action Preview</h1>
        <p className="text-lg text-success">Approved</p>
      </main>
    );
  }

  if (outcome === "rejected") {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 p-4">
        <h1 className="text-4xl font-semibold tracking-tight">Action Preview</h1>
        <p className="text-lg text-danger">Rejected</p>
      </main>
    );
  }

  if (outcome === "edited") {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 p-4">
        <h1 className="text-4xl font-semibold tracking-tight">Action Preview</h1>
        <p className="text-lg text-muted-foreground">Edit mode</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 p-4">
      <h1 className="text-4xl font-semibold tracking-tight">Action Preview</h1>
      <ActionPreview
        tool={mockProps.tool}
        arguments={mockProps.arguments}
        permissions={mockProps.permissions}
        sideEffects={mockProps.sideEffects}
        reversible={mockProps.reversible}
        expiry={mockProps.expiry}
        rationale={mockProps.rationale}
        onApprove={() => setOutcome("approved")}
        onReject={() => setOutcome("rejected")}
        onEdit={() => setOutcome("edited")}
      />
    </main>
  );
}
