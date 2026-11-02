/**
 * Note repository runs SQL queries against notes_memory_service.notes.
 * All read queries filter by user_id.
 * It uses pg Pool for database connections.
 */

import { Injectable, Inject } from "@nestjs/common";
import { Pool } from "pg";
import type { Note, CreateNoteInput, UpdateNoteInput, NoteListFilter } from "./note.entity.js";

const NOTES_TABLE = "notes_memory_service.notes";

@Injectable()
export class NoteRepository {
  constructor(@Inject("PG_POOL") private readonly pool: Pool) {}

  /** Create one note for one user. Returns the created note. */
  async create(userId: string, input: CreateNoteInput): Promise<Note> {
    const query = `
      INSERT INTO ${NOTES_TABLE}
        (user_id, title, content, tags, source_type, source_ref)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING note_id, user_id, title, content, tags, source_type, source_ref,
                is_archived, created_at, updated_at
    `;
    const values = [
      userId,
      input.title,
      input.content,
      input.tags ?? [],
      input.sourceType ?? null,
      input.sourceRef ?? null,
    ];
    const result = await this.pool.query(query, values);
    return this.mapRow(result.rows[0]);
  }

  /** Read one note by ID only if the user owns it.
   * Returns null if not found or not owned. */
  async findById(userId: string, noteId: string): Promise<Note | null> {
    const query = `
      SELECT note_id, user_id, title, content, tags, source_type, source_ref,
             is_archived, created_at, updated_at
      FROM ${NOTES_TABLE}
      WHERE note_id = $2 AND user_id = $1
    `;
    const result = await this.pool.query(query, [userId, noteId]);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  /** List notes for one user with optional tag filter.
   * Ownership enforced: only rows where user_id = $1 are returned. */
  async list(userId: string, filter?: NoteListFilter): Promise<Note[]> {
    let query = `
      SELECT note_id, user_id, title, content, tags, source_type, source_ref,
             is_archived, created_at, updated_at
      FROM ${NOTES_TABLE}
      WHERE user_id = $1
    `;
    const values: unknown[] = [userId];
    let paramIndex = 2;

    if (filter?.tags && filter.tags.length > 0) {
      query += ` AND tags @> $${paramIndex}`;
      values.push(filter.tags);
      paramIndex++;
    }
    if (filter?.isArchived !== undefined) {
      query += ` AND is_archived = $${paramIndex}`;
      values.push(filter.isArchived);
      paramIndex++;
    }

    query += " ORDER BY updated_at DESC";
    const result = await this.pool.query(query, values);
    return result.rows.map((row) => this.mapRow(row));
  }

  /** Update one note only if the user owns it.
   * Throws if not found or not owned. Returns the updated note. */
  async update(userId: string, noteId: string, input: UpdateNoteInput): Promise<Note | null> {
    const current = await this.findById(userId, noteId);
    if (!current) {
      return null;
    }

    const sets: string[] = [];
    const values: unknown[] = [userId, noteId];
    let paramIndex = 3;

    if (input.title !== undefined) {
      sets.push(`title = $${paramIndex}`);
      values.push(input.title);
      paramIndex++;
    }
    if (input.content !== undefined) {
      sets.push(`content = $${paramIndex}`);
      values.push(input.content);
      paramIndex++;
    }
    if (input.tags !== undefined) {
      sets.push(`tags = $${paramIndex}`);
      values.push(input.tags);
      paramIndex++;
    }
    if (input.sourceType !== undefined) {
      sets.push(`source_type = $${paramIndex}`);
      values.push(input.sourceType);
      paramIndex++;
    }
    if (input.sourceRef !== undefined) {
      sets.push(`source_ref = $${paramIndex}`);
      values.push(input.sourceRef);
      paramIndex++;
    }
    if (input.isArchived !== undefined) {
      sets.push(`is_archived = $${paramIndex}`);
      values.push(input.isArchived);
      paramIndex++;
    }

    if (sets.length === 0) {
      return current;
    }

    sets.push(`updated_at = now()`);
    const query = `
      UPDATE ${NOTES_TABLE}
      SET ${sets.join(", ")}
      WHERE note_id = $2 AND user_id = $1
      RETURNING note_id, user_id, title, content, tags, source_type, source_ref,
                is_archived, created_at, updated_at
    `;
    const result = await this.pool.query(query, values);

    // Save previous version to note_versions with the changing user.
    if (result.rows.length > 0) {
      await this.pool.query(
        `INSERT INTO notes_memory_service.note_versions
          (note_id, title, content, tags, source_type, source_ref,
           is_archived, created_at, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          noteId,
          current.title,
          current.content,
          current.tags,
          current.sourceType,
          current.sourceRef,
          current.isArchived,
          current.updatedAt,
          userId,
        ]
      );
    }

    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  /** Delete one note only if the user owns it.
   * Returns true if deleted, false if not found or not owned. */
  async delete(userId: string, noteId: string): Promise<boolean> {
    const query = `
      DELETE FROM ${NOTES_TABLE}
      WHERE note_id = $2 AND user_id = $1
      RETURNING note_id
    `;
    const result = await this.pool.query(query, [userId, noteId]);
    return (result.rowCount ?? 0) > 0;
  }

  /** Map a database row to a Note entity. */
  private mapRow(row: unknown): Note {
    const r = row as Record<string, unknown>;
    return {
      noteId: String(r.note_id),
      userId: String(r.user_id),
      title: String(r.title),
      content: String(r.content),
      tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
      sourceType: r.source_type === null ? null : String(r.source_type),
      sourceRef: r.source_ref === null ? null : String(r.source_ref),
      isArchived: Boolean(r.is_archived),
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    };
  }
}
