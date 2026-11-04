/**
 * NoteSearcher runs user-scoped note search.
 * Full-text first: content matches use the exact migration-31 GIN expression
 * so the index applies. Long offloaded bodies are ranked by Postgres in one
 * batch query. Vector similarity only reranks the text candidates. The rerank
 * ships disabled until an adapter wires NOTE_EMBEDDER; plan row 12 owns that
 * wiring. The adapter must map the batch ML client to this port and catch its
 * throws.
 */

import { Inject, Injectable, Optional } from "@nestjs/common";
import type { Pool } from "pg";
import type { NoteSearchResult } from "./note.entity.js";
import { OBJECT_STORE, type ObjectStore } from "./note.object-storage.js";
import {
  NOTE_EMBEDDER,
  cosine,
  parseVector,
  validQueryVector,
  type NoteEmbedder,
} from "./note.search-vector.js";

const DEFAULT_LIMIT = 20;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;
const DOWNLOAD_CHUNK = 8;
const NOTES_TABLE = "notes_memory_service.notes";

/** One full-text candidate before scoring. */
interface TextCandidate {
  noteId: string;
  title: string;
  rank: number;
  embedding: unknown;
}

@Injectable()
export class NoteSearcher {
  constructor(
    @Inject("PG_POOL") private readonly pool: Pool,
    @Inject(OBJECT_STORE) private readonly objectStore: ObjectStore,
    @Inject(NOTE_EMBEDDER) @Optional() private readonly embedder: NoteEmbedder | null
  ) {}

  /** Search one user's notes. Full-text first; vector rerank when an embedder is wired. */
  async search(userId: string, queryText: string, rawLimit?: number): Promise<NoteSearchResult[]> {
    const query = queryText.replace(/\u0000/g, " ").trim();
    if (query.length === 0) return [];
    const limit = clampLimit(rawLimit);
    const cap = Math.min(Math.max(limit * 5, 50), 100);
    const withEmbedding = this.embedder !== null;

    const candidates = await this.collectCandidates(userId, query, cap, withEmbedding);
    if (candidates.length === 0) return [];

    const maxRank = Math.max(...candidates.map((c) => c.rank));
    // A zero max rank carries no signal: skip normalization and rerank, keep SQL order.
    if (maxRank === 0) {
      return candidates.slice(0, limit).map((c) => ({ noteId: c.noteId, title: c.title, score: 0 }));
    }

    const queryVector = this.embedder ? validQueryVector(await this.safeEmbed(query)) : null;
    const scored = candidates.map((c) => this.scoreCandidate(c, maxRank, queryVector));
    // Node's sort is stable. Candidates arrive in SQL rank order, so ties keep that order.
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  /** Collect and dedup text candidates: inline matches first, then long bodies. */
  private async collectCandidates(
    userId: string,
    query: string,
    cap: number,
    withEmbedding: boolean
  ): Promise<TextCandidate[]> {
    const inline = await this.pool.query(
      `SELECT note_id, title, ts_rank(to_tsvector('english', content), plainto_tsquery('english', $2)) AS rank${withEmbedding ? ", embedding" : ""}
       FROM ${NOTES_TABLE}
       WHERE user_id = $1 AND to_tsvector('english', content) @@ plainto_tsquery('english', $2)
       ORDER BY rank DESC LIMIT $3`,
      [userId, query, cap]
    );
    const candidates: TextCandidate[] = [];
    const seen = new Set<string>();
    for (const row of inline.rows as Record<string, unknown>[]) {
      const noteId = String(row.note_id);
      seen.add(noteId);
      candidates.push({ noteId, title: String(row.title), rank: Number(row.rank), embedding: row.embedding });
    }

    const offloaded = await this.rankOffloadedBodies(userId, query, cap, withEmbedding);
    for (const candidate of offloaded) {
      // First occurrence wins; an inline match already proves ownership and rank.
      if (!seen.has(candidate.noteId)) candidates.push(candidate);
    }
    return candidates;
  }

  /** Rank long offloaded bodies: chunked parallel downloads, then one Postgres batch query. */
  private async rankOffloadedBodies(
    userId: string,
    query: string,
    cap: number,
    withEmbedding: boolean
  ): Promise<TextCandidate[]> {
    const pointerRows = await this.pool.query(
      `SELECT note_id, title, object_store_pointer${withEmbedding ? ", embedding" : ""}
       FROM ${NOTES_TABLE}
       WHERE user_id = $1 AND object_store_pointer IS NOT NULL AND (content IS NULL OR content = '')
       ORDER BY updated_at DESC LIMIT $2`,
      [userId, cap]
    );

    // Strict parallel arrays: noteIds[i] pairs with bodies[i]. A download miss
    // removes the note from both arrays so the ordinality mapping stays true.
    const noteIds: string[] = [];
    const bodies: string[] = [];
    const titles: string[] = [];
    const embeddings: unknown[] = [];
    const rows = pointerRows.rows as Record<string, unknown>[];
    for (let i = 0; i < rows.length; i += DOWNLOAD_CHUNK) {
      const chunk = rows.slice(i, i + DOWNLOAD_CHUNK);
      const downloaded = await Promise.all(chunk.map((row) => this.safeDownload(row.object_store_pointer)));
      for (let j = 0; j < chunk.length; j++) {
        const body = downloaded[j];
        if (body === null || body === undefined) continue;
        noteIds.push(String(chunk[j]!.note_id));
        titles.push(String(chunk[j]!.title));
        embeddings.push(chunk[j]!.embedding);
        bodies.push(body.replace(/\u0000/g, " "));
      }
    }
    if (bodies.length === 0) return [];

    // Postgres ranks the bodies with the same expression and scale as inline rows.
    const batch = await this.pool.query(
      `SELECT ord AS body_index, ts_rank(to_tsvector('english', body), plainto_tsquery('english', $2)) AS rank
       FROM unnest($1::text[]) WITH ORDINALITY AS t(body, ord)
       WHERE to_tsvector('english', body) @@ plainto_tsquery('english', $2)`,
      [bodies, query]
    );
    const candidates: TextCandidate[] = [];
    for (const row of batch.rows as Record<string, unknown>[]) {
      // WITH ORDINALITY is 1-based bigint; node-pg returns it as a string.
      const index = Number(row.body_index) - 1;
      const noteId = noteIds[index];
      if (noteId === undefined) continue;
      candidates.push({ noteId, title: titles[index]!, rank: Number(row.rank), embedding: embeddings[index] });
    }
    return candidates;
  }

  /** Download one body. Null on miss or error, so one bad pointer cannot fail the search. */
  private async safeDownload(pointer: unknown): Promise<string | null> {
    if (typeof pointer !== "string" || pointer.length === 0) return null;
    try {
      return await this.objectStore.download(pointer);
    } catch {
      return null;
    }
  }

  /** Score one candidate. Unknown embeddings stay neutral: pure text rank, no penalty. */
  private scoreCandidate(c: TextCandidate, maxRank: number, queryVector: number[] | null): NoteSearchResult {
    const normRank = c.rank / maxRank;
    if (!queryVector) return { noteId: c.noteId, title: c.title, score: normRank };
    const embedding = parseVector(c.embedding);
    // Dimension mismatch or malformed text is unknown evidence: keep the text score.
    if (!embedding || embedding.length !== queryVector.length) {
      return { noteId: c.noteId, title: c.title, score: normRank };
    }
    const cosine01 = Math.min(1, Math.max(0, (1 + cosine(embedding, queryVector)) / 2));
    return { noteId: c.noteId, title: c.title, score: 0.5 * normRank + 0.5 * cosine01 };
  }

  /** Embed one query. Any failure or malformed result degrades to text-only search. */
  private async safeEmbed(query: string): Promise<number[] | null> {
    if (!this.embedder) return null;
    try {
      return validQueryVector(await this.embedder.embed(query));
    } catch {
      return null;
    }
  }
}

/** Coerce and clamp the limit. Non-finite input falls back to the default. */
function clampLimit(rawLimit: number | undefined): number {
  const value = typeof rawLimit === "number" ? rawLimit : Number.NaN;
  if (!Number.isFinite(value)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, Math.trunc(value)));
}
