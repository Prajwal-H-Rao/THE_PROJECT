/**
 * Tests for the ats_provider resolver (plan task 7).
 * Each hint resolves or returns "unknown" — including both hostile
 * hostname payloads, which must never resolve to a permitted provider.
 */

import { test } from "node:test";
import { strictEqual } from "node:assert";
import { resolveAtsProvider, ATS_PROVIDERS } from "./ats-resolver.js";

test("each official board URL resolves to its provider", () => {
  strictEqual(resolveAtsProvider("https://boards.greenhouse.io/acme"), "greenhouse");
  strictEqual(resolveAtsProvider("https://job-boards.greenhouse.io/acme"), "greenhouse");
  strictEqual(resolveAtsProvider("https://jobs.lever.co/acme"), "lever");
  strictEqual(resolveAtsProvider("https://jobs.ashbyhq.com/acme"), "ashby");
  strictEqual(resolveAtsProvider("https://careers.smartrecruiters.com/acme"), "smartrecruiters");
});

test("scheme-less official hints resolve", () => {
  strictEqual(resolveAtsProvider("boards.greenhouse.io/acme"), "greenhouse");
  strictEqual(resolveAtsProvider("jobs.lever.co/acme"), "lever");
});

test("case and whitespace tolerance", () => {
  strictEqual(resolveAtsProvider("  HTTPS://Boards.Greenhouse.IO/acme  "), "greenhouse");
  strictEqual(resolveAtsProvider("HTTPS://JOBS.LEVER.CO/acme"), "lever");
});

test("hostile hostname payloads never resolve", () => {
  // Pattern in the path must not match.
  strictEqual(resolveAtsProvider("https://evil.com/boards.greenhouse.io/fake"), "unknown");
  // Pattern in a hostile hostname suffix must not match.
  strictEqual(resolveAtsProvider("https://boards.greenhouse.io.evil.com/x"), "unknown");
  strictEqual(resolveAtsProvider("https://notboards.greenhouse.io/x"), "unknown");
});

test("custom domains, empty and garbage hints return unknown", () => {
  strictEqual(resolveAtsProvider("https://careers.acme.com/jobs"), "unknown");
  strictEqual(resolveAtsProvider(""), "unknown");
  strictEqual(resolveAtsProvider("   "), "unknown");
  strictEqual(resolveAtsProvider("not a url at all"), "unknown");
  strictEqual(resolveAtsProvider("https://"), "unknown");
});

test("never throws on any input", () => {
  const garbage: readonly string[] = ["\u0000", "https://[::1", "://", "a".repeat(5000)];
  for (const hint of garbage) {
    strictEqual(resolveAtsProvider(hint), "unknown");
  }
});

test("provider tuple holds exactly the four permitted providers", () => {
  strictEqual(ATS_PROVIDERS.length, 4);
});
