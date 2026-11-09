/**
 * Nova design system - Inbox page test (task 09.18, module 09).
 * Verifies the three-pane layout per spec:407: folder/filter rail,
 * message list, reading pane. Each pane keeps its source, freshness
 * and action controls. Summaries stay distinguishable from the original
 * message and quoted text. Tablet/mobile switch to list then detail.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { InboxPage, type InboxMessage } from "./page";

afterEach(cleanup);

const messages: InboxMessage[] = [
  {
    id: "m1",
    sender: "alice@example.com",
    subject: "Quarterly report",
    snippet: "Quarterly numbers attached for review.",
    receivedAt: "2026-11-09T09:15:00Z",
    body: "Full quarterly breakdown with margins and cash flow.",
    quoted: "On 2 Nov, Bob wrote: please send the numbers.",
    folder: "inbox",
    unread: true,
  },
  {
    id: "m2",
    sender: "carol@example.com",
    subject: "Kickoff moved",
    snippet: "The kickoff moved to Thursday.",
    receivedAt: "2026-11-09T08:30:00Z",
    body: "The kickoff moved to Thursday 10:00 in the big room.",
    folder: "inbox",
    unread: true,
  },
  {
    id: "m3",
    sender: "dave@example.com",
    subject: "Invoice paid",
    snippet: "Invoice 42 is settled.",
    receivedAt: "2026-11-08T17:00:00Z",
    body: "Invoice 42 has been settled in full.",
    folder: "inbox",
    unread: false,
  },
  {
    id: "m4",
    sender: "erin@example.com",
    subject: "Old newsletter",
    snippet: "Monthly product digest.",
    receivedAt: "2026-11-02T12:00:00Z",
    body: "Monthly product digest for November.",
    folder: "archive",
    unread: false,
  },
];

describe("InboxPage", () => {
  it("renders the folder rail with all three filters", () => {
    render(<InboxPage initialMessages={messages} />);
    expect(screen.getByRole("button", { name: "Folder: Inbox" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Folder: Unread" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Folder: Archive" })).toBeInTheDocument();
  });

  it("every pane keeps its source label", () => {
    render(<InboxPage initialMessages={messages} />);
    fireEvent.click(within(screen.getByTestId("message-list")).getByText("Quarterly report"));
    // Rail and reading pane each hold their own source label.
    expect(screen.getAllByText("Source: Gmail").length).toBeGreaterThanOrEqual(2);
  });

  it("rail and list keep freshness and action controls", () => {
    render(<InboxPage initialMessages={messages} />);
    expect(screen.getByTestId("rail-freshness")).toHaveTextContent("Synced");
    expect(screen.getByTestId("list-freshness")).toHaveTextContent("Updated");
    expect(screen.getByRole("button", { name: "Refresh sync" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh list" })).toBeInTheDocument();
  });

  it("message list shows sender and subject for the current folder", () => {
    render(<InboxPage initialMessages={messages} />);
    expect(screen.getByText("Quarterly report")).toBeInTheDocument();
    expect(screen.getByText("Invoice paid")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
  });

  it("Unread filter hides read and archived messages", () => {
    render(<InboxPage initialMessages={messages} />);
    fireEvent.click(screen.getByRole("button", { name: "Folder: Unread" }));
    expect(screen.getByText("Kickoff moved")).toBeInTheDocument();
    expect(screen.queryByText("Invoice paid")).not.toBeInTheDocument();
    expect(screen.queryByText("Old newsletter")).not.toBeInTheDocument();
  });

  it("Archive filter shows archived messages", () => {
    render(<InboxPage initialMessages={messages} />);
    fireEvent.click(screen.getByRole("button", { name: "Folder: Archive" }));
    expect(screen.getByText("Old newsletter")).toBeInTheDocument();
    expect(screen.queryByText("Quarterly report")).not.toBeInTheDocument();
  });

  it("selecting a message opens the reading pane with three distinct labelled blocks", () => {
    render(<InboxPage initialMessages={messages} />);
    fireEvent.click(within(screen.getByTestId("message-list")).getByText("Quarterly report"));
    const pane = screen.getByTestId("reading-pane");
    expect(pane).toHaveTextContent("Summary:");
    expect(pane).toHaveTextContent("Quarterly numbers attached for review.");
    expect(pane).toHaveTextContent("Original:");
    expect(pane).toHaveTextContent("Full quarterly breakdown with margins and cash flow.");
    expect(pane).toHaveTextContent("Quoted:");
    expect(pane).toHaveTextContent("On 2 Nov, Bob wrote: please send the numbers.");
  });

  it("reading pane keeps source, freshness and action controls", () => {
    render(<InboxPage initialMessages={messages} />);
    fireEvent.click(within(screen.getByTestId("message-list")).getByText("Quarterly report"));
    const pane = screen.getByTestId("reading-pane");
    expect(pane).toHaveTextContent("Source: Gmail");
    expect(screen.getByTestId("reading-freshness")).toHaveTextContent("Retrieved");
    expect(screen.getByRole("button", { name: "Mark as read" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archive message" })).toBeInTheDocument();
  });

  it("mark as read clears the unread state and shrinks the Unread view", () => {
    render(<InboxPage initialMessages={messages} />);
    fireEvent.click(within(screen.getByTestId("message-list")).getByText("Quarterly report"));
    fireEvent.click(screen.getByRole("button", { name: "Mark as read" }));
    fireEvent.click(screen.getByRole("button", { name: "Folder: Unread" }));
    expect(screen.queryByText("Quarterly report")).not.toBeInTheDocument();
  });

  it("archiving removes the message from the Inbox view", () => {
    render(<InboxPage initialMessages={messages} />);
    fireEvent.click(within(screen.getByTestId("message-list")).getByText("Invoice paid"));
    fireEvent.click(screen.getByRole("button", { name: "Archive message" }));
    expect(screen.queryByText("Invoice paid")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Folder: Archive" }));
    expect(screen.getByText("Invoice paid")).toBeInTheDocument();
  });

  it("back-to-list control carries the lg:hidden responsive class", () => {
    render(<InboxPage initialMessages={messages} />);
    fireEvent.click(within(screen.getByTestId("message-list")).getByText("Kickoff moved"));
    const back = screen.getByRole("button", { name: "Back to list" });
    expect(back).toHaveClass("lg:hidden");
  });

  it("shows an empty state when a folder has no messages", () => {
    render(
      <InboxPage
        initialMessages={[
          {
            id: "m5",
            sender: "solo@example.com",
            subject: "Only read note",
            snippet: "Already read.",
            receivedAt: "2026-11-08T10:00:00Z",
            body: "Already read fully.",
            folder: "inbox",
            unread: false,
          },
        ]}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Folder: Unread" }));
    expect(screen.getByTestId("message-list")).toHaveTextContent("No messages");
  });
});
