/**
 * Tests for NoteService - cross-user read denial and CRUD enforcement.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { Pool } from "pg";
import { NoteService, NoteNotFoundError } from "./note.service.js";
import { NoteRepository } from "./note.repository.js";
import { InMemoryObjectStore } from "./note.object-storage.js";
import type { CreateNoteInput, NoteListFilter, UpdateNoteInput } from "./note.entity.js";

function makeRepo(config: {
  owned: boolean;
  createTitle?: string;
  updateTitle?: string;
}): NoteRepository {
  const repo = new NoteRepository({} as unknown as Pool, new InMemoryObjectStore());
  repo.findById = async (_userId: string, _noteId: string) => {
    if (!config.owned) return null;
    return {
      noteId: _noteId,
      userId: _userId,
      title: config.updateTitle ?? "Note",
      content: null,
      tags: [],
      sourceType: null,
      sourceRef: null,
      isArchived: false,
      objectStorePointer: null,
      embedding: null,
      createdAt: "t",
      updatedAt: "t",
    };
  };
  repo.list = async (_userId: string, _filter?: NoteListFilter) => {
    if (!config.owned) return [];
    return [
      {
        noteId: "n-1",
        userId: _userId,
        title: config.updateTitle ?? "Note",
        content: null,
        tags: [],
        sourceType: null,
        sourceRef: null,
        isArchived: false,
        objectStorePointer: null,
        embedding: null,
        createdAt: "t",
        updatedAt: "t",
      },
    ];
  };
  repo.create = async (_userId: string, input: CreateNoteInput) => ({
    noteId: "n-1",
    userId: _userId,
    title: input.title,
    content: null,
    tags: [],
    sourceType: null,
    sourceRef: null,
    isArchived: false,
    objectStorePointer: null,
    embedding: null,
    createdAt: "t",
    updatedAt: "t",
  });
  repo.update = async (_userId: string, _noteId: string, input: UpdateNoteInput) => {
    if (!config.owned) return null;
    return {
      noteId: _noteId,
      userId: _userId,
      title: input.title ?? config.updateTitle ?? "Changed",
      content: null,
      tags: [],
      sourceType: null,
      sourceRef: null,
      isArchived: false,
      objectStorePointer: null,
      embedding: null,
      createdAt: "t",
      updatedAt: "t",
    };
  };
  repo.delete = async () => config.owned;
  return repo;
}

describe("NoteService", () => {
  it("creates note for user", async () => {
    const repo = makeRepo({ owned: true });
    const service = new NoteService(repo);

    const note = await service.createNote("user-1", { title: "Note 1", content: "" });
    assert.strictEqual(note.title, "Note 1");
    assert.strictEqual(note.userId, "user-1");
  });

  it("getNote throws NoteNotFoundError when user does not own note", async () => {
    const repo = makeRepo({ owned: false });
    const service = new NoteService(repo);

    await assert.rejects(
      () => service.getNote("user-1", "note-2"),
      NoteNotFoundError
    );
  });

  it("listNotes returns empty when no notes owned", async () => {
    const repo = makeRepo({ owned: false });
    const service = new NoteService(repo);

    const notes = await service.listNotes("user-1");
    assert.strictEqual(notes.length, 0);
  });

  it("updateNote throws NoteNotFoundError when user does not own note", async () => {
    const repo = makeRepo({ owned: false });
    const service = new NoteService(repo);

    await assert.rejects(
      () => service.updateNote("user-1", "note-2", { title: "Changed" }),
      NoteNotFoundError
    );
  });

  it("deleteNote throws NoteNotFoundError when user does not own note", async () => {
    const repo = makeRepo({ owned: false });
    const service = new NoteService(repo);

    await assert.rejects(
      () => service.deleteNote("user-1", "note-2"),
      NoteNotFoundError
    );
  });
});
