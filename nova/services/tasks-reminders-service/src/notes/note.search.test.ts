/**
 * Tests for NoteSearcher: full-text first, Postgres-ranked offloaded bodies,
 * vector rerank on parsed pgvector strings, and graceful degradation.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { NoteSearcher } from "./note.search.js";
import { SearchUnavailableError } from "./note.service.js";
import { InMemoryObjectStore } from "./note.object-storage.js";
import { makeFakePool, vectorText, type FakeRoute } from "./note.search.fakes.js";
import type { NoteRepository } from "./note.repository.js";
import { NoteService } from "./note.service.js";

const INLINE = "to_tsvector('english', content) @@ plainto_tsquery";
const POINTERS = "object_store_pointer IS NOT NULL";
const BATCH = "WITH ORDINALITY";

/** Build routes for an inline-only search with the given ranked rows. */
function inlineRoutes(rows: Record<string, unknown>[]): FakeRoute[] {
  return [
    { match: INLINE, rows },
    { match: POINTERS, rows: [] },
  ];
}

/** Build a 384-dim unit vector along axis 0, signed. */
const axis = (sign: number): number[] => Array.from({ length: 384 }, (_v, i) => (i === 0 ? sign : 0));

describe("NoteSearcher", () => {
  it("returns note IDs with the user filter and the exact indexed expression", async () => {
    const { pool, queries } = makeFakePool(
      inlineRoutes([
        { note_id: "n-1", title: "T1", rank: 0.12 },
        { note_id: "n-2", title: "T2", rank: 0.05 },
      ])
    );
    const searcher = new NoteSearcher(pool, new InMemoryObjectStore(), null);

    const results = await searcher.search("user-1", "running");

    assert.strictEqual(results.length, 2);
    assert.strictEqual(results[0]!.noteId, "n-1");
    assert.ok(Math.abs(results[1]!.score - 0.05 / 0.12) < 1e-9);
    const sql = queries[0]!.sql;
    assert.ok(sql.includes("WHERE user_id = $1"));
    assert.ok(sql.includes("to_tsvector('english', content) @@ plainto_tsquery('english', $2)"));
    // The bound value is the candidate cap: max(limit*5, 50) capped at 100.
    assert.strictEqual(queries[0]!.values[2], 100);
  });

  it("reranks with parsed pgvector string embeddings and reorders", async () => {
    const { pool } = makeFakePool(inlineRoutes([
      { note_id: "n-low", title: "Low rank, high match", rank: 0.1, embedding: JSON.stringify(axis(1)) },
      { note_id: "n-high", title: "High rank, no match", rank: 0.9, embedding: JSON.stringify(axis(-1)) },
    ]));
    const searcher = new NoteSearcher(pool, new InMemoryObjectStore(), {
      embed: async () => axis(1),
    });

    const results = await searcher.search("user-1", "match");

    // n-low: 0.5*0.11 + 0.5*1 = 0.555; n-high: 0.5*0.89 + 0.5*0 = 0.445. Reordered.
    assert.strictEqual(results[0]!.noteId, "n-low");
    assert.strictEqual(results[1]!.noteId, "n-high");
  });

  it("degrades to text order when the embedder is absent, throws, or dims mismatch", async () => {
    const routes = inlineRoutes([
      { note_id: "n-1", title: "T1", rank: 0.12 },
      { note_id: "n-2", title: "T2", rank: 0.06 },
    ]);
    const embedders = [
      null,
      { embed: async () => { throw new Error("ML down"); } },
      { embed: async () => [1, 2, 3] },
    ];
    for (const embedder of embedders) {
      const { pool } = makeFakePool(routes);
      const searcher = new NoteSearcher(pool, new InMemoryObjectStore(), embedder);
      const results = await searcher.search("user-1", "q");
      assert.strictEqual(results[0]!.score, 1);
      assert.ok(Math.abs(results[1]!.score - 0.5) < 1e-9);
    }
  });

  it("keeps the pure text score for a malformed embedding", async () => {
    const { pool } = makeFakePool(inlineRoutes([
      { note_id: "n-good", title: "Valid vector", rank: 0.1, embedding: vectorText(1) },
      { note_id: "n-bad", title: "Malformed", rank: 0.08, embedding: "not-json" },
    ]));
    const searcher = new NoteSearcher(pool, new InMemoryObjectStore(), {
      embed: async () => axis(1),
    });

    const results = await searcher.search("user-1", "q");

    assert.strictEqual(results.length, 2);
    const bad = results.find((r) => r.noteId === "n-bad")!;
    const good = results.find((r) => r.noteId === "n-good")!;
    assert.ok(Math.abs(bad.score - 0.08 / 0.1) < 1e-9);
    assert.ok(good.score > 0.5 * (0.1 / 0.1));
  });

  it("finds long notes via the offloaded-body batch and skips download misses", async () => {
    const store = new InMemoryObjectStore();
    await store.upload("obj://user-1/note/9", "the quick brown fox");
    const { pool, queries } = makeFakePool([
      { match: INLINE, rows: [] },
      {
        match: POINTERS,
        rows: [
          { note_id: "n-9", title: "Long", object_store_pointer: "obj://user-1/note/9", embedding: null },
          { note_id: "n-404", title: "Dangling", object_store_pointer: "obj://user-1/note/404", embedding: null },
        ],
      },
      { match: BATCH, rows: [{ body_index: "1", rank: 0.2 }] },
    ]);
    const searcher = new NoteSearcher(pool, store, null);

    const results = await searcher.search("user-1", "fox");

    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0]!.noteId, "n-9");
    assert.strictEqual(results[0]!.score, 1);
    const batch = queries.find((q) => q.sql.includes(BATCH))!;
    assert.ok(batch.sql.includes("WITH ORDINALITY AS t(body, ord)"));
    assert.deepStrictEqual(batch.values[0], ["the quick brown fox"]);
  });

  it("returns no results when no offloaded body matches", async () => {
    const store = new InMemoryObjectStore();
    await store.upload("obj://user-1/note/9", "unrelated words only");
    const { pool } = makeFakePool([
      { match: INLINE, rows: [] },
      { match: POINTERS, rows: [{ note_id: "n-9", title: "Long", object_store_pointer: "obj://user-1/note/9" }] },
      { match: BATCH, rows: [] },
    ]);
    const searcher = new NoteSearcher(pool, store, null);

    const results = await searcher.search("user-1", "missing");
    assert.strictEqual(results.length, 0);
  });

  it("guards the limit: non-finite falls back, large clamps, blank query returns none", async () => {
    const rows = [
      { note_id: "n-1", title: "T1", rank: 0.3 },
      { note_id: "n-2", title: "T2", rank: 0.2 },
      { note_id: "n-3", title: "T3", rank: 0.1 },
    ];
    const { pool, queries } = makeFakePool(inlineRoutes(rows));
    const searcher = new NoteSearcher(pool, new InMemoryObjectStore(), null);
    // Each search runs the inline query first; filter to it before asserting.
    const setA = () => queries.filter((q) => q.sql.includes(INLINE));

    // Non-finite limit falls back to 20: all three rows come back.
    const fallback = await searcher.search("user-1", "q", Number.parseInt("abc", 10));
    assert.strictEqual(fallback.length, 3);
    await searcher.search("user-1", "q", 150);
    assert.strictEqual(setA()[1]!.values[2], 100);
    await searcher.search("user-1", "q", 50);
    assert.strictEqual(setA()[2]!.values[2], 100);
    // Small limits slice the candidate list.
    const sliced = await searcher.search("user-1", "q", 2);
    assert.strictEqual(sliced.length, 2);

    const none = await searcher.search("user-1", "   ");
    assert.strictEqual(none.length, 0);
    assert.strictEqual(setA().length, 4);

    await searcher.search("user-1", "q\u0000x");
    assert.strictEqual(setA()[4]!.values[1], "q x");
  });

  it("returns SQL-order zero scores when every rank is zero", async () => {
    const { pool } = makeFakePool(inlineRoutes([
      { note_id: "n-1", title: "T1", rank: 0 },
      { note_id: "n-2", title: "T2", rank: 0 },
    ]));
    const searcher = new NoteSearcher(pool, new InMemoryObjectStore(), null);

    const results = await searcher.search("user-1", "q");
    assert.deepStrictEqual(results.map((r) => r.score), [0, 0]);
    assert.strictEqual(results[0]!.noteId, "n-1");
  });

  it("service delegates when configured and throws when not", async () => {
    const { pool } = makeFakePool(inlineRoutes([{ note_id: "n-1", title: "T1", rank: 0.1 }]));
    const searcher = new NoteSearcher(pool, new InMemoryObjectStore(), null);
    const repoStub = {} as unknown as NoteRepository;

    const configured = new NoteService(repoStub, searcher);
    const results = await configured.searchNotes("user-1", "q");
    assert.strictEqual(results.length, 1);

    const unconfigured = new NoteService(repoStub);
    await assert.rejects(() => unconfigured.searchNotes("user-1", "q"), SearchUnavailableError);
  });
});
