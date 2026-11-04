/**
 * Note service performs CRUD operations with ownership enforcement.
 * Cross-user read denied: every operation filters by user_id.
 */

import { Injectable, Optional } from "@nestjs/common";
import { NoteRepository } from "./note.repository.js";
import { NoteSearcher } from "./note.search.js";
import type { Note, CreateNoteInput, UpdateNoteInput, NoteListFilter, NoteVersion, RestoreVersionInput, NoteSearchResult } from "./note.entity.js";

export class NoteNotFoundError extends Error {
  constructor(public readonly noteId: string) {
    super(`Note not found: ${noteId}`);
    this.name = "NoteNotFoundError";
  }
}

export class NoteForbiddenError extends Error {
  constructor(public readonly noteId: string) {
    super(`Access denied to note: ${noteId}`);
    this.name = "NoteForbiddenError";
  }
}

/** Raised when search runs without a wired NoteSearcher. */
export class SearchUnavailableError extends Error {
  constructor() {
    super("Note search is not configured");
    this.name = "SearchUnavailableError";
  }
}

@Injectable()
export class NoteService {
  constructor(
    private readonly repository: NoteRepository,
    // Optional keeps existing one-argument constructions valid.
    @Optional() private readonly search?: NoteSearcher
  ) {}

  /** Create one note for one user. Returns the created note. */
  async createNote(userId: string, input: CreateNoteInput): Promise<Note> {
    return this.repository.create(userId, input);
  }

  /** Read one note by ID only if the user owns it.
   * Throws NoteNotFoundError if not found or not owned. */
  async getNote(userId: string, noteId: string): Promise<Note> {
    const note = await this.repository.findById(userId, noteId);
    if (!note) {
      throw new NoteNotFoundError(noteId);
    }
    return note;
  }

  /** List notes for one user with optional tag/archive filter.
   * Ownership enforced: only rows where user_id matches are returned. */
  async listNotes(userId: string, filter?: NoteListFilter): Promise<Note[]> {
    return this.repository.list(userId, filter);
  }

  /** Update one note only if the user owns it.
   * Throws NoteNotFoundError if not found or not owned. */
  async updateNote(
    userId: string,
    noteId: string,
    input: UpdateNoteInput,
  ): Promise<Note> {
    const note = await this.repository.update(userId, noteId, input);
    if (!note) {
      throw new NoteNotFoundError(noteId);
    }
    return note;
  }

  /** Delete one note only if the user owns it.
   * Throws NoteNotFoundError if not found or not owned. */
  async deleteNote(userId: string, noteId: string): Promise<void> {
    const deleted = await this.repository.delete(userId, noteId);
    if (!deleted) {
      throw new NoteNotFoundError(noteId);
    }
  }

  /** Export one note only if the user owns it.
   * Returns the full note including body and object-store pointer.
   * Throws NoteNotFoundError if not found or not owned. */
  async exportNote(userId: string, noteId: string): Promise<Note> {
    const note = await this.repository.findById(userId, noteId);
    if (!note) {
      throw new NoteNotFoundError(noteId);
    }
    return note;
  }

  /** Get version history for a note. */
  async getVersionHistory(userId: string, noteId: string): Promise<NoteVersion[]> {
    return this.repository.getVersionHistory(userId, noteId);
  }

  /** Restore a note to a specific version. */
  async restoreVersion(userId: string, noteVersionId: string): Promise<Note> {
    const note = await this.repository.restoreVersion(userId, noteVersionId);
    if (!note) {
      throw new NoteNotFoundError(noteVersionId);
    }
    return note;
  }

  /** Get a specific version by ID. */
  async getVersion(userId: string, noteVersionId: string): Promise<NoteVersion | null> {
    return this.repository.getVersion(userId, noteVersionId);
  }

  /** Search the user's notes. Throws SearchUnavailableError when no searcher is wired. */
  async searchNotes(userId: string, query: string, limit?: number): Promise<NoteSearchResult[]> {
    if (!this.search) {
      throw new SearchUnavailableError();
    }
    return this.search.search(userId, query, limit);
  }
}
