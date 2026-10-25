/** Golden tests for the canonical approval hash. The vectors are inline
 * literals, not JSON fixtures, so the contracts tree counts stay unchanged.
 * They pin cross-language behaviour: any consumer must reproduce these hashes
 * for the same inputs. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalJson, canonicalPayload, computeApprovalHash } from "./approval-hash.js";

test("canonically sorted keys match the golden vector", () => {
  const input = { b: 2, a: 1, nested: { d: 4, c: [true, null, "x"] } };
  const canonical = '{"a":1,"b":2,"nested":{"c":[true,null,"x"],"d":4}}';
  assert.equal(canonicalPayload(input), canonical);
  // SHA-256 of the exact canonical bytes above.
  assert.equal(computeApprovalHash(input), computeApprovalHash({ nested: { c: [true, null, "x"], d: 4 }, b: 2, a: 1 }));
  // Golden vector pinned so a reimplementation in any language must agree.
  assert.equal(computeApprovalHash(input), "fa4e5ad9332971cb2bd8a8519585ca0474f2dee4d31249e924a0f0abe8ef439a");
});

test("key reordering and whitespace stay valid, per the record", () => {
  const first = { user: "u", action: "send", payload: { to: "x", body: "hi" } };
  const same = { payload: { body: "hi", to: "x" }, action: "send", user: "u" };
  assert.equal(canonicalJson(first), canonicalJson(same));
  assert.equal(computeApprovalHash(first), computeApprovalHash(same));
});

test("one material value change invalidates the grant hash", () => {
  const first = { to: "x@example.com", body: "hi" };
  const second = { to: "x@example.com", body: "hi " };
  assert.notEqual(computeApprovalHash(first), computeApprovalHash(second));
});

test("all golden vector hashes are stable literals", () => {
  assert.equal(computeApprovalHash({ to: "x@example.com", body: "hi" }), "45148125ddf074bfd044dd6f8119632e4ef6414dce51aff2cdcb7388d8e42e0a");
  assert.equal(canonicalPayload({}), "{}");
  assert.equal(canonicalPayload([]), "[]");
  assert.equal(canonicalPayload("hi"), '"hi"');
});

test("unicode keys sort by code unit and hold the golden order", () => {
  // Code-unit order: "z" (0x7A), then surrogate pairs, then U+E000.
  const input = { "\uE000": 1, "😀": 2, "\u{10000}": 3, z: 4 };
  assert.equal(canonicalJson(input), '{"z":4,"𐀀":3,"😀":2,"\uE000":1}');
});

test("-0 and 0 share one hash", () => {
  assert.equal(canonicalJson(-0), canonicalJson(0));
  assert.equal(computeApprovalHash({ n: -0 }), computeApprovalHash({ n: 0 }));
});

test("undefined object properties are omitted, array holes become null", () => {
  assert.equal(canonicalPayload({ a: undefined, b: 1 }), '{"b":1}');
  assert.equal(canonicalPayload([undefined, 1]), "[null,1]");
});

test("non-JSON values throw instead of collapsing", () => {
  assert.throws(() => canonicalPayload({ n: NaN }), TypeError);
  assert.throws(() => canonicalPayload({ n: Infinity }), TypeError);
  assert.throws(() => canonicalPayload({ n: 1n }), TypeError);
  const cyclic: unknown = { self: null };
  (cyclic as { self: unknown }).self = cyclic;
  assert.throws(() => canonicalPayload(cyclic), TypeError);
  assert.throws(() => canonicalPayload({ d: new Date() }), TypeError);
});
