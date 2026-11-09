/**
 * Nova design system - Calendar page test (task 09.16, module 09).
 * Verifies: each view keeps the timezone, no category or status relies
 * on colour alone, and the write preview lists invitees and conflicts
 * (spec:408). Week view differs from agenda (spec:405).
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CalendarPage, type CalendarEvent } from "./page";

afterEach(cleanup);

const mockEvents: CalendarEvent[] = [
  {
    id: "evt-1",
    title: "Team Meeting",
    start: "2026-11-01T09:00:00Z",
    end: "2026-11-01T10:00:00Z",
    attendees: ["alice@example.com", "bob@example.com"],
    status: "confirmed",
    category: "work",
  },
  {
    id: "evt-2",
    title: "Project Review",
    start: "2026-11-01T09:30:00Z",
    end: "2026-11-01T11:00:00Z",
    attendees: ["carol@example.com"],
    status: "pending",
    category: "work",
  },
];

// A far-future event: agenda shows it, week view (next 7 days) hides it.
const FAR_EVENT: CalendarEvent = {
  id: "evt-far",
  title: "Yearly Planning",
  start: "2027-06-01T09:00:00Z",
  end: "2027-06-01T10:00:00Z",
  attendees: ["erin@example.com"],
  status: "pending",
  category: "personal",
};

describe("CalendarPage", () => {
  it("renders the timezone selector", () => {
    render(<CalendarPage initialEvents={mockEvents} />);
    expect(screen.getByLabelText("Timezone")).toBeInTheDocument();
  });

  it("keeps the timezone across view changes", () => {
    render(<CalendarPage initialEvents={mockEvents} />);
    fireEvent.change(screen.getByLabelText("Timezone"), {
      target: { value: "Asia/Tokyo" },
    });
    for (const name of ["Week", "Month", "Agenda"]) {
      fireEvent.click(screen.getByRole("button", { name: `View: ${name}` }));
      expect(screen.getByLabelText("Timezone")).toHaveValue("Asia/Tokyo");
    }
  });

  it("shows status and category as text labels, not colour alone", () => {
    render(<CalendarPage initialEvents={mockEvents} />);
    expect(screen.getAllByText("confirmed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("pending").length).toBeGreaterThan(0);
    expect(screen.getAllByText("work").length).toBeGreaterThan(0);
  });

  it("formats times in the selected timezone", () => {
    render(<CalendarPage initialEvents={mockEvents} />);
    // 09:00Z is 18:00 in Tokyo; the GMT+9 abbreviation labels the shift.
    fireEvent.change(screen.getByLabelText("Timezone"), {
      target: { value: "Asia/Tokyo" },
    });
    expect(screen.getAllByText(/GMT\+9/).length).toBeGreaterThan(0);
  });

  it("week view differs from agenda: it hides far-future events", () => {
    render(<CalendarPage initialEvents={[...mockEvents, FAR_EVENT]} />);
    expect(screen.getByText("Yearly Planning")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View: Week" }));
    expect(screen.getByTestId("week-cells")).toBeInTheDocument();
    expect(screen.queryByText("Yearly Planning")).not.toBeInTheDocument();
    expect(screen.getByText("Team Meeting")).toBeInTheDocument();
  });

  it("month view renders a day grid", () => {
    render(<CalendarPage initialEvents={mockEvents} />);
    fireEvent.click(screen.getByRole("button", { name: "View: Month" }));
    expect(screen.getByTestId("month-grid")).toBeInTheDocument();
    expect(screen.getAllByTestId("month-cell").length).toBeGreaterThan(0);
  });

  it("write preview lists invitees and conflicts when an event is selected", () => {
    render(<CalendarPage initialEvents={mockEvents} />);
    fireEvent.click(within(screen.getByTestId("event-evt-1")).getByText("Team Meeting"));
    const preview = screen.getByTestId("approval-preview");
    expect(preview).toHaveTextContent("Invitees:");
    expect(preview).toHaveTextContent("alice@example.com");
    expect(preview).toHaveTextContent("bob@example.com");
    expect(preview).toHaveTextContent("Conflicts:");
    expect(preview).toHaveTextContent("Project Review");
  });

  it("write preview shows no conflicts for a clear slot", () => {
    render(
      <CalendarPage
        initialEvents={[
          {
            id: "evt-3",
            title: "Solo Focus",
            start: "2026-11-02T09:00:00Z",
            end: "2026-11-02T10:00:00Z",
            attendees: ["dave@example.com"],
            status: "pending",
            category: "personal",
          },
        ]}
      />
    );
    fireEvent.click(screen.getByText("Solo Focus"));
    const preview = screen.getByTestId("approval-preview");
    expect(preview).toHaveTextContent("Invitees:");
    expect(preview).toHaveTextContent("Conflicts: None");
  });
});
