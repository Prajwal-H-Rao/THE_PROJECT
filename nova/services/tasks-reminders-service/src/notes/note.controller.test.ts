/**
 * Tests for NoteController - header enforcement and CRUD enforcement.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { HttpException } from "@nestjs/common";
import { NoteController } from "./note.controller.js";
import { NoteService, NoteNotFoundError, SearchUnavailableError } from "./note.service.js";

function makeService(config: {
  owned: boolean;
}): NoteService {
  class FakeService {
    async createNote(_userId: string, _input: unknown) {
      if (!config.owned) throw new Error("not owned");
      return { noteId: "n-1", userId: "user-1", title: "Note 1" };
    }
    async getNote(_userId: string, _noteId: string) {
      if (!config.owned) throw new NoteNotFoundError("note-2");
      return { noteId: "note-2", userId: "user-1", title: "Note 2" };
    }
    async listNotes(_userId: string) {
      if (!config.owned) return [];
      return [{ noteId: "n-1", userId: "user-1", title: "Note 1" }];
    }
    async updateNote(_userId: string, _noteId: string, _input: unknown) {
      if (!config.owned) throw new NoteNotFoundError("note-2");
      return { noteId: "note-2", userId: "user-1", title: "Changed" };
    }
    async deleteNote(_userId: string, _noteId: string) {
      if (!config.owned) throw new NoteNotFoundError("note-2");
      return undefined;
    }
  }
  return new FakeService() as unknown as NoteService;
}

/** Fake service that records searchNotes calls or raises a configured error. */
function makeSearchService(behavior: {
  error?: Error;
}): { service: NoteService; calls: { query: string; limit: number | undefined }[] } {
  const calls: { query: string; limit: number | undefined }[] = [];
  class FakeSearchService {
    async searchNotes(userId: string, query: string, limit?: number) {
      calls.push({ query, limit });
      if (behavior.error) throw behavior.error;
      return [{ noteId: "n-1", title: "T1", score: 1 }];
    }
  }
  return { service: new FakeSearchService() as unknown as NoteService, calls };
}

describe("NoteController", () => {
  it("rejects missing x-user-id header", async () => {
    const service = makeService({ owned: true });
    const controller = new NoteController(service);

    await assert.rejects(() => controller.create("", { title: "x", content: "" }), Error);
  });

  it("creates note for user", async () => {
    const service = makeService({ owned: true });
    const controller = new NoteController(service);

    const note = await controller.create("user-1", { title: "Note 1", content: "" });
    assert.strictEqual(note.title, "Note 1");
  });

  it("getOne maps NoteNotFoundError to NotFoundException", async () => {
    const service = makeService({ owned: false });
    const controller = new NoteController(service);

    await assert.rejects(
      () => controller.getOne("user-1", "note-2"),
      Error
    );
  });

  it("updateNote maps NoteNotFoundError to NotFoundException", async () => {
    const service = makeService({ owned: false });
    const controller = new NoteController(service);

    await assert.rejects(
      () => controller.update("user-1", "note-2", { title: "Changed" }),
      Error
    );
  });

  it("deleteNote maps NoteNotFoundError to NotFoundException", async () => {
    const service = makeService({ owned: false });
    const controller = new NoteController(service);

    await assert.rejects(() => controller.delete("user-1", "note-2"), Error);
  });

  it("search rejects missing header and blank or missing q", async () => {
    const { service } = makeSearchService({});
    const controller = new NoteController(service);

    await assert.rejects(() => controller.search("", "fox"), Error);
    await assert.rejects(() => controller.search("user-1", undefined), Error);
    await assert.rejects(() => controller.search("user-1", "   "), Error);
  });

  it("search passes a parsed limit and returns results", async () => {
    const { service, calls } = makeSearchService({});
    const controller = new NoteController(service);

    const results = await controller.search("user-1", "fox", "50");
    assert.strictEqual(results.length, 1);
    assert.strictEqual(calls[0]!.query, "fox");
    assert.strictEqual(calls[0]!.limit, 50);

    await controller.search("user-1", "fox", "abc");
    assert.ok(Number.isNaN(calls[1]!.limit));
  });

  it("search maps SearchUnavailableError to 503", async () => {
    const { service } = makeSearchService({ error: new SearchUnavailableError() });
    const controller = new NoteController(service);

    await assert.rejects(
      () => controller.search("user-1", "fox"),
      (error: unknown) => {
        assert.ok(error instanceof HttpException);
        assert.strictEqual(error.getStatus(), 503);
        return true;
      }
    );
  });
});
