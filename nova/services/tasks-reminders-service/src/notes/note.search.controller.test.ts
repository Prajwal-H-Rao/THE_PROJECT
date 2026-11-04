/**
 * Tests for NoteSearchController - search and export endpoints.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { HttpException } from "@nestjs/common";
import { NoteSearchController } from "./note.search.controller.js";
import {
  NoteService,
  NoteNotFoundError,
  SearchUnavailableError,
} from "./note.service.js";

function makeSearchService(behavior: {
  owned: boolean;
  error?: Error;
}): { service: NoteService; calls: { query: string; limit: number | undefined }[] } {
  const calls: { query: string; limit: number | undefined }[] = [];
  class FakeSearchService {
    async searchNotes(userId: string, query: string, limit?: number) {
      calls.push({ query, limit });
      if (!behavior.owned) throw new NoteNotFoundError("note-2");
      if (behavior.error) throw behavior.error;
      return [{ noteId: "n-1", title: "T1", score: 1 }];
    }
    async getNote(_userId: string, _noteId: string) {
      if (!behavior.owned) throw new NoteNotFoundError("note-2");
      return { noteId: "n-1", userId: "user-1", title: "Note 1", content: "Body" };
    }
    async exportNote(_userId: string, _noteId: string) {
      if (!behavior.owned) throw new NoteNotFoundError("note-2");
      return { noteId: "n-1", userId: "user-1", title: "Note 1", content: "Body" };
    }
  }
  return { service: new FakeSearchService() as unknown as NoteService, calls };
}

describe("NoteSearchController", () => {
  it("search rejects missing header and blank or missing q", async () => {
    const { service } = makeSearchService({ owned: true });
    const controller = new NoteSearchController(service);

    await assert.rejects(() => controller.search("", "fox"), Error);
    await assert.rejects(() => controller.search("user-1", undefined), Error);
    await assert.rejects(() => controller.search("user-1", "   "), Error);
  });

  it("search passes a parsed limit and returns results", async () => {
    const { service, calls } = makeSearchService({ owned: true });
    const controller = new NoteSearchController(service);

    const results = await controller.search("user-1", "fox", "50");
    assert.strictEqual(results.length, 1);
    assert.strictEqual(calls[0]!.query, "fox");
    assert.strictEqual(calls[0]!.limit, 50);

    await controller.search("user-1", "fox", "abc");
    assert.ok(Number.isNaN(calls[1]!.limit));
  });

  it("search maps SearchUnavailableError to 503", async () => {
    const { service } = makeSearchService({
      owned: true,
      error: new SearchUnavailableError(),
    });
    const controller = new NoteSearchController(service);

    await assert.rejects(
      () => controller.search("user-1", "fox"),
      (error: unknown) => {
        assert.ok(error instanceof HttpException);
        assert.strictEqual(error.getStatus(), 503);
        return true;
      }
    );
  });

  it("export returns note with body", async () => {
    const { service } = makeSearchService({ owned: true });
    const controller = new NoteSearchController(service);

    const note = await controller.exportNote("user-1", "n-1");
    assert.strictEqual(note.noteId, "n-1");
    assert.strictEqual(note.content, "Body");
  });

  it("export rejects missing header", async () => {
    const { service } = makeSearchService({ owned: true });
    const controller = new NoteSearchController(service);

    await assert.rejects(() => controller.exportNote("", "n-1"), Error);
  });

  it("export maps NoteNotFoundError to NotFoundException", async () => {
    const { service } = makeSearchService({ owned: false });
    const controller = new NoteSearchController(service);

    await assert.rejects(
      () => controller.exportNote("user-1", "note-2"),
      Error
    );
  });
});
