/**
 * Nova design system - DraftPreview test (task 09.8, module 09).
 * Verifies the draft preview shows the exact payload that will be sent:
 * "Preview equals the send payload."
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { DraftPreview } from "./DraftPreview";

afterEach(() => {
  // testing-library auto-cleanup is not wired in test-setup.ts; do it manually.
  document.body.innerHTML = "";
});

const draftData = {
  draftId: "draft-123",
  to: "alice@example.com",
  subject: "Meeting tomorrow",
  body: "Hi Alice, let's meet tomorrow at 10am.",
};

describe("DraftPreview", () => {
  it("renders draft preview with exact payload", () => {
    render(
      <DraftPreview
        draftId={draftData.draftId}
        to={draftData.to}
        subject={draftData.subject}
        body={draftData.body}
        onSend={vi.fn()}
        onCancel={vi.fn()}
        grantNonce="grant-abc"
        target="message:draft-123"
      />,
    );

    // Preview shows the exact draft payload
    expect(screen.getByText(draftData.to)).toBeInTheDocument();
    expect(screen.getByText(draftData.subject)).toBeInTheDocument();
    expect(screen.getByText(draftData.body)).toBeInTheDocument();
  });

  it("sends exact draft payload — preview equals send payload", async () => {
    const sendSpy = vi.fn().mockResolvedValue({ messageId: "msg-123" });

    render(
      <DraftPreview
        draftId={draftData.draftId}
        to={draftData.to}
        subject={draftData.subject}
        body={draftData.body}
        onSend={sendSpy}
        onCancel={vi.fn()}
        grantNonce="grant-abc"
        target="message:draft-123"
      />,
    );

    const sendButton = screen.getByRole("button", { name: /send/i });
    fireEvent.click(sendButton);

    await vi.waitFor(() => {
      expect(sendSpy).toHaveBeenCalledWith(
        draftData.draftId,
        "grant-abc",
        {
          to: draftData.to,
          subject: draftData.subject,
          body: draftData.body,
        },
        "message:draft-123",
      );
    });
  });

  it("shows loading state while sending", async () => {
    const sendSpy = vi.fn().mockResolvedValue({ messageId: "msg-123" });

    render(
      <DraftPreview
        draftId={draftData.draftId}
        to={draftData.to}
        subject={draftData.subject}
        body={draftData.body}
        onSend={sendSpy}
        onCancel={vi.fn()}
        grantNonce="grant-abc"
        target="message:draft-123"
        loading
      />,
    );

    const sendButton = screen.getByRole("button", { name: /send/i });
    expect(sendButton).toBeDisabled();
  });

  it("cancel fires cancel callback", () => {
    const cancelSpy = vi.fn();

    render(
      <DraftPreview
        draftId={draftData.draftId}
        to={draftData.to}
        subject={draftData.subject}
        body={draftData.body}
        onSend={vi.fn()}
        onCancel={cancelSpy}
        grantNonce="grant-abc"
        target="message:draft-123"
      />,
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);
    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });
});
