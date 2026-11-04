/**
 * Nova design system - Note list view.
 * Renders notes as cards with tags and linked references.
 * All user-facing text comes from props (no hardcoded text).
 */

"use client";

import * as React from "react";
import { NoteCard } from "@/components/cards/note-card";
import { CardState } from "@/components/ui/card-state";
import { Badge } from "@/components/ui/badge";
import type { Note } from "@/lib/api-types";

interface NoteListProps {
  notes: Note[];
}

export function NoteList({ notes }: NoteListProps) {
  if (notes.length === 0) {
    return (
      <CardState state="empty" emptyLabel="No notes" emptyMessage="No notes found." />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {notes.map((note) => {
        return (
          <div key={note.noteId} className="flex flex-col gap-2">
            <NoteCard
              state="default"
              title={note.title}
              body={note.content ?? undefined}
              updated={note.updatedAt}
            />
            {note.tags && note.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {note.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
