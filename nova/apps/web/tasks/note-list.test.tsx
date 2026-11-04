/**
 * Tests for NoteList component.
 * Verifies note list renders from real data with tags.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NoteList } from "./note-list";
import type { Note } from "@/lib/api-types";

const baseNote: Note = {
  noteId: "n-1",
  userId: "user-1",
  title: "Test note",
  content: "Note content",
  tags: [],
  sourceType: null,
  sourceRef: null,
  isArchived: false,
  objectStorePointer: null,
  embedding: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

function makeNote(overrides: Partial<Note>): Note {
  return { ...baseNote, ...overrides };
}

describe("NoteList", () => {
  it("renders notes from real data with tags", () => {
    const notes = [
      makeNote({
        noteId: "n-1",
        title: "Meeting notes",
        tags: ["work", "urgent"],
      }),
      makeNote({
        noteId: "n-2",
        title: "Shopping list",
        tags: ["personal"],
      }),
    ];

    render(<NoteList notes={notes} />);

    expect(screen.getByText("Meeting notes")).toBeTruthy();
    expect(screen.getByText("Shopping list")).toBeTruthy();
    expect(screen.getByText("work")).toBeTruthy();
    expect(screen.getByText("urgent")).toBeTruthy();
    expect(screen.getByText("personal")).toBeTruthy();
  });

  it("shows empty state when no notes", () => {
    render(<NoteList notes={[]} />);

    expect(screen.getByText("No notes found.")).toBeTruthy();
  });
});
