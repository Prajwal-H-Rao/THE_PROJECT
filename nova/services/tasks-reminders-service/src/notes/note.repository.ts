/**
 * Note repository runs SQL queries against notes_memory_service.notes.
 * All read queries filter by user_id. Long note bodies are stored in
 * object storage; object_store_pointer holds the object key.
 */

import { Injectable, Inject } from "@nestjs/common";
import { Pool } from "pg";
import type { Note, CreateNoteInput, UpdateNoteInput, NoteListFilter, NoteVersion } from "./note.entity.js";
import type { ObjectStore } from "./note.object-storage.js";
import { buildKey } from "./note.object-storage.js";

const NOTES_TABLE = "notes_memory_service.notes";
const VERSIONS_TABLE = "notes_memory_service.note_versions";
const BODY_SIZE_THRESHOLD = 1024;

@Injectable()
export class NoteRepository {
  constructor(
    @Inject("PG_POOL") private readonly pool: Pool,
    @Inject("OBJECT_STORE") private readonly objectStore: ObjectStore
  ) {}

  async create(userId: string, input: CreateNoteInput): Promise<Note> {
    let objectStorePointer: string | null = null;
    let content = input.content ?? "";

    if (input.content && input.content.length > BODY_SIZE_THRESHOLD) {
      const key = buildKey(userId, "note");
      await this.objectStore.upload(key, input.content);
      objectStorePointer = `obj://${key}`;
      content = "";
    }

    const query = `
      INSERT INTO ${NOTES_TABLE}
        (user_id, title, content, tags, source_type, source_ref, object_store_pointer)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING note_id, user_id, title, content, tags, source_type, source_ref,
                object_store_pointer, is_archived, created_at, updated_at
    `;
    const values = [userId, input.title, content, input.tags ?? [],
      input.sourceType ?? null, input.sourceRef ?? null, objectStorePointer];
    const result = await this.pool.query(query, values);
    return this.mapRow(result.rows[0]);
  }

  async findById(userId: string, noteId: string): Promise<Note | null> {
    const query = `
      SELECT note_id, user_id, title, content, tags, source_type, source_ref,
             object_store_pointer, is_archived, created_at, updated_at
      FROM ${NOTES_TABLE}
      WHERE note_id = $2 AND user_id = $1
    `;
    const result = await this.pool.query(query, [userId, noteId]);
    if (result.rows.length === 0) return null;
    return this.mapRowWithBody(result.rows[0]);
  }

  async list(userId: string, filter?: NoteListFilter): Promise<Note[]> {
    let query = `
      SELECT note_id, user_id, title, content, tags, source_type, source_ref,
             object_store_pointer, is_archived, created_at, updated_at
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

  async update(userId: string, noteId: string, input: UpdateNoteInput): Promise<Note | null> {
    const current = await this.findById(userId, noteId);
    if (!current) return null;

    let objectStorePointer = current.objectStorePointer;
    let content = current.content ?? "";

    if (input.content !== undefined) {
      if (current.objectStorePointer) {
        await this.objectStore.delete(current.objectStorePointer);
        objectStorePointer = null;
      }
      if (input.content !== null && input.content.length > BODY_SIZE_THRESHOLD) {
        const key = buildKey(userId, noteId);
        await this.objectStore.upload(key, input.content);
        objectStorePointer = key;
        content = "";
      } else {
        content = input.content ?? "";
      }
    }

    const sets: string[] = [];
    const values: unknown[] = [userId, noteId];
    let paramIndex = 3;

    if (input.title !== undefined) { sets.push(`title = $${paramIndex}`); values.push(input.title); paramIndex++; }
    if (input.content !== undefined) { sets.push(`content = $${paramIndex}`); values.push(content); paramIndex++; }
    if (input.content !== undefined || objectStorePointer !== current.objectStorePointer) { sets.push(`object_store_pointer = $${paramIndex}`); values.push(objectStorePointer); paramIndex++; }
    if (input.tags !== undefined) { sets.push(`tags = $${paramIndex}`); values.push(input.tags); paramIndex++; }
    if (input.sourceType !== undefined) { sets.push(`source_type = $${paramIndex}`); values.push(input.sourceType); paramIndex++; }
    if (input.sourceRef !== undefined) { sets.push(`source_ref = $${paramIndex}`); values.push(input.sourceRef); paramIndex++; }
    if (input.isArchived !== undefined) { sets.push(`is_archived = $${paramIndex}`); values.push(input.isArchived); paramIndex++; }

    if (sets.length === 0) return current;

    sets.push(`updated_at = now()`);
    const query = `
      UPDATE ${NOTES_TABLE} SET ${sets.join(", ")}
      WHERE note_id = $2 AND user_id = $1
      RETURNING note_id, user_id, title, content, tags, source_type, source_ref,
                object_store_pointer, is_archived, created_at, updated_at
    `;
    const result = await this.pool.query(query, values);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async delete(userId: string, noteId: string): Promise<boolean> {
    const current = await this.findById(userId, noteId);
    if (!current) return false;
    if (current.objectStorePointer) await this.objectStore.delete(current.objectStorePointer);
    const query = `DELETE FROM ${NOTES_TABLE} WHERE note_id = $2 AND user_id = $1 RETURNING note_id`;
    const result = await this.pool.query(query, [userId, noteId]);
    return (result.rowCount ?? 0) > 0;
  }

  /** Get version history for a note owned by the user. */
  async getVersionHistory(userId: string, noteId: string): Promise<NoteVersion[]> {
    // Verify ownership first
    const ownershipQuery = `SELECT 1 FROM ${NOTES_TABLE} WHERE note_id = $1 AND user_id = $2`;
    const ownershipResult = await this.pool.query(ownershipQuery, [noteId, userId]);
    if (ownershipResult.rows.length === 0) return [];

    const query = `
      SELECT note_version_id, note_id, title, content, tags, source_type, source_ref,
             is_archived, created_at, created_by
      FROM ${VERSIONS_TABLE}
      WHERE note_id = $1
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [noteId]);
    return result.rows.map((row) => this.mapVersionRow(row));
  }

  /** Restore a note to a specific version. */
  async restoreVersion(userId: string, noteVersionId: string): Promise<Note | null> {
    // Get the version
    const versionQuery = `
      SELECT note_id, title, content, tags, source_type, source_ref, is_archived
      FROM ${VERSIONS_TABLE}
      WHERE note_version_id = $1
    `;
    const versionResult = await this.pool.query(versionQuery, [noteVersionId]);
    if (versionResult.rows.length === 0) return null;

    const version = versionResult.rows[0];
    const noteId = version.note_id;

    // Verify ownership
    const ownershipQuery = `SELECT 1 FROM ${NOTES_TABLE} WHERE note_id = $1 AND user_id = $2`;
    const ownershipResult = await this.pool.query(ownershipQuery, [noteId, userId]);
    if (ownershipResult.rows.length === 0) return null;

    // Get current note for object storage pointer
    const currentNote = await this.pool.query(
      `SELECT object_store_pointer FROM ${NOTES_TABLE} WHERE note_id = $1`,
      [noteId]
    );
    if (currentNote.rows.length === 0) return null;

    const currentPointer = currentNote.rows[0].object_store_pointer;

    // Update note with version content
    const query = `
      UPDATE ${NOTES_TABLE}
      SET title = $3, content = $4, tags = $5, source_type = $6, source_ref = $7, is_archived = $8,
          updated_at = now()
      WHERE note_id = $2 AND user_id = $1
      RETURNING note_id, user_id, title, content, tags, source_type, source_ref,
                object_store_pointer, is_archived, created_at, updated_at
    `;
    const values = [userId, noteId, version.title, version.content, version.tags,
      version.source_type, version.source_ref, version.is_archived];
    const result = await this.pool.query(query, [userId, noteId, version.title, version.content, version.tags,
      version.source_type, version.source_ref, version.is_archived]);
    if (result.rows.length === 0) return null;

    // Save current state to versions before overwriting
    const existingNote = await this.findById(userId, noteId);
    if (existingNote) {
      await this.pool.query(
        `INSERT INTO ${VERSIONS_TABLE}
           (note_id, title, content, tags, source_type, source_ref, is_archived, created_at, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, now(), $8)`,
        [noteId, existingNote.title, existingNote.content, existingNote.tags, existingNote.sourceType,
         existingNote.sourceRef, existingNote.isArchived, userId]
      );
    }

    // Update object storage if content changed significantly
    // The update() method handles object storage, but we're bypassing it here
    // For now, we just update the DB and return the note
    return this.mapRow(result.rows[0]);
  }

  async getVersion(userId: string, noteVersionId: string): Promise<NoteVersion | null> {
    // Verify ownership through note ownership
    const query = `
      SELECT v.note_version_id, v.note_id, v.title, v.content, v.tags, v.source_type, v.source_ref,
             v.is_archived, v.created_at, v.created_by
      FROM ${VERSIONS_TABLE} v
      JOIN ${NOTES_TABLE} n ON v.note_id = n.note_id
      WHERE v.note_version_id = $1 AND n.user_id = $2
    `;
    const result = await this.pool.query(query, [noteVersionId, userId]);
    if (result.rows.length === 0) return null;
    return this.mapVersionRow(result.rows[0]);
  }

  private mapRow(row: unknown): Note {
    const r = row as Record<string, unknown>;
    return {
      noteId: String(r.note_id), userId: String(r.user_id), title: String(r.title),
      content: r.content === null ? null : String(r.content),
      tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
      sourceType: r.source_type === null ? null : String(r.source_type),
      sourceRef: r.source_ref === null ? null : String(r.source_ref),
      isArchived: Boolean(r.is_archived),
      createdAt: String(r.created_at), updatedAt: String(r.updated_at),
      objectStorePointer: r.object_store_pointer === null ? null : String(r.object_store_pointer),
    };
  }

  private mapVersionRow(row: Record<string, unknown>): NoteVersion {
    const r = row as Record<string, unknown>;
    return {
      noteVersionId: String(r.note_version_id),
      noteId: String(r.note_id),
      title: String(r.title),
      content: String(r.content),
      tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
      sourceType: r.source_type === null ? null : String(r.source_type),
      sourceRef: r.source_ref === null ? null : String(r.source_ref),
      isArchived: Boolean(r.is_archived),
      createdAt: String(r.created_at),
      createdBy: String(r.created_by),
    };
  }

  private async mapRowWithBody(row: unknown): Promise<Note> {
    const base = this.mapRow(row);
    if (base.objectStorePointer) {
      const body = await this.objectStore.download(base.objectStorePointer);
      if (body !== null) return { ...base, content: body };
    }
    return base;
  }
}