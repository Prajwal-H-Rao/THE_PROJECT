/** Tests for the profile version guard. A used version cannot be edited. */

import assert from "node:assert/strict";
import { test } from "node:test";
import { assertVersionEditable } from "./profile-guard.js";

test("a version with no used_at stays editable", () => {
  assert.doesNotThrow(() =>
    assertVersionEditable({ profile_id: "p1", version: 1, used_at: null }),
  );
});

test("a used version cannot be edited", () => {
  assert.throws(
    () => assertVersionEditable({ profile_id: "p1", version: 2, used_at: "2026-11-13T10:00:00Z" }),
    /profile version in use: p1 v2/,
  );
});
