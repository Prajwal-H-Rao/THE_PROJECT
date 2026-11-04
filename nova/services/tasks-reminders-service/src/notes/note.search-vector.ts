/**
 * Note search vector helpers.
 * Holds the NOTE_EMBEDDER token, the NoteEmbedder port and the vector math
 * for the note rerank. Separate file so note.search.ts stays under 200 lines.
 */

/** DI token for the optional note embedder. Null by default; plan row 12 wires the adapter. */
export const NOTE_EMBEDDER = "NOTE_EMBEDDER";

/** Expected embedding dimensions. Migration 37 declares vector(384) for all-MiniLM-L6-v2. */
export const EMBEDDING_DIMS = 384;

/** Port for embedding one query text. Returns null when the ML service is unavailable. */
export interface NoteEmbedder {
  embed(text: string): Promise<number[] | null>;
}

/** Parse a pgvector value into number[]. Returns null for absent or malformed input.
 * The pg driver returns vector(384) as text like "[0.01,-0.02]"; JSON.parse reads that form. */
export function parseVector(raw: unknown): number[] | null {
  if (Array.isArray(raw)) return allFinite(raw) ? raw : null;
  if (typeof raw !== "string") return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return allFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Check that every element is a finite number. Type guard for the parsed array. */
function allFinite(values: unknown[]): values is number[] {
  return values.every((v) => typeof v === "number" && Number.isFinite(v));
}

/** Accept a query vector only at the right dimensions with all finite elements. */
export function validQueryVector(vector: number[] | null): number[] | null {
  if (!vector || vector.length !== EMBEDDING_DIMS) return null;
  return allFinite(vector) ? vector : null;
}

/** Cosine similarity of two equal-length vectors. The caller checks lengths. */
export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
