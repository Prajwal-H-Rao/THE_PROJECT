/**
 * Note repository runs SQL queries against notes_memory_service.notes.
 * All read queries filter by user_id. Long note bodies are stored in
 * object storage; object_store_pointer holds the object key.
 */

import { Injectable, Inject } from "@nestjs/common";
import { Pool } from "pg";
import type { Note, CreateNoteInput, UpdateNoteInput, NoteListFilter } from "./note.entity.js";
import type { ObjectStore } from "./note.object-storage.js";
import { buildKey } from "./note.object-storage.js";

const NOTES_TABLE = "notes_memory_service.notes";
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

  private async mapRowWithBody(row: unknown): Promise<Note> {
    const base = this.mapRow(row);
    if (base.objectStorePointer) {
      const body = await this.objectStore.download(base.objectStorePointer);
      if (body !== null) return { ...base, content: body };
    }
    return base;
  }
}
