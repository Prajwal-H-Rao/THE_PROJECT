# NEGATOR REPORT — v4 Plan Verification (Option A v4)

**Verdict: BLOCKED** — Do not implement v4 as written. Seven blocking objections verified against the working tree and HEAD (commit 14c32e8).

**Method:** Read working-tree files, `git show HEAD:<path>`, `git ls-files`, `git diff HEAD`, `wc -l`, and ran `python3 nova/tests/layout/check_layout.py`.

---

## 1. Ordering: restored tests fail before the service throws (BLOCKING)

**Files:** `nova/services/tasks-reminders-service/src/tasks/task.service.test.ts`, `.../src/tasks/task.service.ts`, `.../src/tasks/task.controller.ts`.

Step 1.1 restores `task.service.test.ts` from HEAD. The HEAD test asserts `assert.rejects(..., TaskNotFoundError)` for `getTask`, `updateTask`, and `deleteTask`. Step 1.4 restores the throwing behavior. v4 runs Step 1.1 before Step 1.4 with no test-fix window.

**Verified facts:**
- Working-tree `task.service.ts` has **0** `throw` statements (38 lines). `getTask` returns `Task | null` directly. `deleteTask` returns a boolean. It never throws.
- HEAD `task.service.ts` has **3** `throw` statements and defines `TaskNotFoundError` / `TaskForbiddenError`.
- `task.controller.ts` catches `TaskNotFoundError` at lines 56, 90, 109 and converts it to `NotFoundException`. Since the working-tree service never throws, a not-found task returns HTTP 200 with a null body instead of 404.

**Result:** Between Step 1.1 and Step 1.4, the restored tests fail against the stripped service. After Step 1.4, the controller's existing catch works only if the service throws first. The ordering is wrong.

---

## 2. Step 1.1 contradicts the no-`any` rule (BLOCKING)

**File:** `nova/services/tasks-reminders-service/src/tasks/task.service.test.ts`.

Step 1.1 says restore the file from HEAD. Step 1.2 says rewrite it to remove all 4 `any`. These contradict: you cannot both restore verbatim and remove all `any`.

**Verified fact:** HEAD `task.service.test.ts` uses `any` in exactly 4 places: line 15 (`new TaskRepository({} as any)`), line 33 (`repo.list`), line 52 (`repo.create`), line 66 (`repo.update`). The no-`any` rule is absolute for TypeScript files. v4's Step 1.2 must rewrite the mock repository with explicit types while keeping the throw-expecting assertions. v4 gives no type plan for that rewrite.

---

## 3. MCP split (2.1) is incomplete and creates undeclared files (BLOCKING)

**Files:** `nova/packages/contracts/mcp/tool.ts`, `audit.ts`, `call.ts`, `tool.py`, `tool.test.ts`, `call.test.ts`, `audit.test.ts`, `index.ts`.

**Verified facts:**
- `tool.ts` = 268 lines, `audit.ts` = 243 lines, `call.ts` = 213 lines. All exceed 200. v4 lists these three. Correct so far.
- `tool.py` = **219 lines** (>200). v4 omits it. If the 200-line rule applies to Python too, `tool.py` is a violation v4 does not fix.
- `tool.test.ts` = 402 lines, `call.test.ts` = 363 lines, `audit.test.ts` = 274 lines. All exceed 200. v4 does not address test files.
- `index.ts` **already exists** and already barrel-re-exports `./tool.js`, `./call.js`, `./audit.js`. v4 says "Add barrel re-exports in index.ts." That is wrong — it must **update** `index.ts` to point at the new per-operation files, not add a barrel that already exists.
- `families.yaml` does **not exist** anywhere in the repo (verified with `find`). v4 correctly drops it. Prior negator reports wrongly claimed it exists at 239 lines.
- Splitting `tool.ts`/`audit.ts`/`call.ts` creates **new per-operation files**. v4 Step 2.1 adds no plan rows for them. `tree_checks.check_tree_files` rejects any source file not declared in a plan backtick path (`owned = plan_index.owned_paths`). New MCP files will be rejected as "the tree holds the undeclared file ...".

---

## 4. audit-repository.sql.ts premise is wrong; defaults fix is incomplete (BLOCKING)

**Files:** `nova/services/audit-service/src/audit-repository.sql.ts`, `.../src/audit-repository.ts`, `.../src/audit-repository.test.ts`, `nova/packages/contracts/migrations/03-audit-schema.sql`.

**Verified facts:**
- `audit-repository.sql.ts` lines 42 and 63 already use `input.executionStatus ?? "pending"`. v4 Step 2.2 says fix sql.ts:42-43, 63-64 as if `executionStatus` needs changing to `"pending"`. That is already done. Only `verificationType ?? "none"` at lines 43 and 64 needs changing (to `"evidence"` per v4).
- `audit-repository.ts` (in-memory) has **four** default sites, all `executionStatus ?? "succeeded"` + `verificationType ?? "none"`: lines 43-44, 61-62 (InMemoryAuditRepository), lines 133-134, 151-152 (TestAuditRepository). v4 does not enumerate all four. A literal reading of v4 risks fixing only two sites and leaving `TestAuditRepository` producing `succeeded`+`none`.
- DB check constraint `03-audit-schema.sql:42-45`: `CHECK (execution_status <> 'succeeded' OR verification_type <> 'none')`. The `succeeded`+`none` combination violates it. The SQL repository relies on the DB trigger; the in-memory repository bypasses it, so tests using `InMemoryAuditRepository` or `TestAuditRepository` pass invalid state that production Postgres would reject.
- `audit-repository.test.ts:430-431` asserts `record.executionStatus === "succeeded"` and `record.verificationType === "none"`. v4 says update these (correct), but the change is mandatory, not optional.
- `verificationType ?? "evidence"` uses `"evidence"`, which is **not** in the documented `verification_type` set (`'none' | 'signature' | 'receipt' | 'external' | 'human'`, schema line 19 comment) nor the `sql.ts` cast union (line 156). It passes the DB check constraint (since `pending` <> `succeeded`), but it is an undocumented value.

---

## 5. JWT guard work (2.4): wrong path, missing dependencies, breaks existing tests (BLOCKING)

**Files:** `nova/services/policy-approval-service/src/approval/grants.controller.ts`, `.../src/policy/policy.controller.ts`, `nova/services/audit-service/src/audit.controller.ts`, both `package.json`.

**Verified facts:**
- `grants.controller.ts` is at `src/approval/grants.controller.ts`, **not** `src/policy/grants.controller.ts` as v4 assumes. Its docstring (line 1) states: "no caller authentication yet (tasks 7 and 10 own the trust story)." v4's path is wrong and the trust story explicitly defers auth elsewhere.
- Neither `policy-approval-service/package.json` nor `audit-service/package.json` lists `@nestjs/passport`, `@nestjs/jwt`, `passport`, or `jsonwebtoken`. A NestJS `CanActivate` JWT guard needs one of these, or manual use of `verifyToken` from `@nova/contracts`. v4 does not specify how the guard verifies the service token or which dependency to add.
- `policy.controller.ts` `extractCallerContext` (lines 19-35) **fails open**: with no token or an invalid token it returns `{ service: "unknown", scopes: [], userId: undefined }`. v4 wants a 401 reject instead. Existing tests call `decide`/`decide/bulk` directly with no token; changing to reject breaks them. v4 says "update tests calling these endpoints directly" but names no tests and gives no fixture plan.
- `audit.controller.ts` has **zero authentication** (verified: only `BadRequestException` validation for missing fields).
- Adding a guard risks double authentication with the existing manual `verifyToken` in `policy.controller.ts` and `policy-admin.controller.ts`. v4 does not address integration.

---

## 6. Module 10 notes (3.2/3.3): overlap with existing code and unaddressed ripple effects (BLOCKING)

**Files:** `nova/services/tasks-reminders-service/src/notes/note.repository.ts`, `.../src/notes/note.entity.ts`, `nova/packages/contracts/migrations/33-note-versions.sql`.

**Verified facts:**
- `note.repository.ts` already exists (untracked, 187 lines). `findById(noteId)` (lines 40-49) and `delete(noteId)` (lines 161-169) do **not** filter by `user_id` — an ownership gap unlike `task.repository.ts`. `update(noteId, ...)` calls `findById(noteId)` at line 82 without `user_id`.
- v4 Step 3.2 wants a `user_id` filter on `findById`/`delete`. Changing `findById`'s signature breaks `update()`'s call at line 82 unless `update()` is also changed. v4 does not mention `update()`.
- `note.repository.ts` line 139 inserts into `notes_memory_service.note_versions`. Migration 33 (`33-note-versions.sql`) is **untracked** (`git ls-files` finds nothing; `git status` lists it untracked). If migration 33 is not applied, the `note_versions` table does not exist and `update()` fails at runtime. v4 only says "verify migration 33 tracking status" — it is untracked, so this is an unresolved inconsistency.
- v4 Step 3.3 says "Complete note service/controller/tests in src/notes/," but `note.entity.ts` and `note.repository.ts` already exist. Adding a note service and controller duplicates or conflicts with this in-flight code. v4 gives no reconciliation plan.
- `note.entity.ts` and `note.repository.ts` headers both say "Nova design system" (a mislabel). v4 Step 1.5 fixes these headers, which is correct.
- Both files are already flagged as undeclared in baseline `check P` (see Objection 7).

---

## 7. tree_checks undeclared-file rejection; baseline layout already fails (BLOCKING)

**Files:** `nova/tests/layout/tree_checks.py`, `nova/tests/layout/plan_index.py`, `docs/plan/10-tasks-notes.md`.

**Verified facts:**
- `tree_checks.check_tree_files(index, owned)` rejects every source file not in `owned`. `owned` comes solely from backtick tokens in plan build-sequence rows (`plan_index.owned_paths`). v4 Step 3.4 adds plan rows only for **new note file paths**. MCP split files (Objection 3) and guard files (Objection 5) are not declared in any plan row, so `check P` rejects them as undeclared.
- Baseline `check_layout.py` already fails 4 checks: **B** (unknown directories: `evals/...`), **H** (empty leaf directories and counts), **M** (scope claims: tree has 186 directories and 115 leaves; `EXPECTED_DIRECTORIES = 132`, `EXPECTED_LEAVES = 88`), **P** (undeclared files including `task.controller.ts`, `task.entity.ts`, `task.repository.ts`, `task.service.ts`, `tasks.module.ts`, `notes/note.entity.ts`, `notes/note.repository.ts`).
- v4 operates in a tree that already fails layout checks due to out-of-scope untracked service directories and `evals/`. v4 cannot achieve "all tests pass" on layout without addressing those out-of-scope directories, which are not in v4's scope.
- `models/` exists and is tracked (`git ls-files` lists `.gitkeep`, `model-registry.yaml`, `setup.sh`, `test_model_registry.py`). v4 Step 2.5 correctly says no bump to `EXPECTED_DIRECTORIES`, but the baseline directory count (186) already exceeds `EXPECTED_DIRECTORIES` (132), so the count is already wrong independent of v4.

---

## 8. Items v4 addresses correctly (not objections)

- Step 1.3: fix `recurrence-parser.ts`/`recurrence-service.ts` "Nova design system" headers — verified both HEAD versions carry that mislabel.
- Step 1.4: restore `TaskNotFoundError`/`TaskForbiddenError` and throwing behavior — verified working tree lacks them; HEAD has them.
- Step 1.5: fix headers in `task.repository.ts`, `task.controller.ts`, `note.entity.ts`, `note.repository.ts` — verified all four carry the "Nova design system" mislabel; HEAD versions have proper domain headers.
- Step 2.3: `mypy==2.4.0` does not exist (mypy releases are 1.x as of 2026); CI installs it at line 30 before `mypy nova` at line 41 and before requirements at line 45. v4's fix (pin to `1.11.0`, install requirements before mypy) is sound.
- Step 3.1: remove duplicate `idx_notes_tags_gin` from `31-notes-fulltext.sql` — verified `06-tasks-schema.sql:44` already creates `idx_notes_tags ... USING GIN (tags)`, so `31-notes-fulltext.sql`'s `idx_notes_tags_gin ... USING GIN (tags)` is a duplicate. Removing it from 31 resolves the duplication.

---

## Summary of blocking objections

| # | Objection | Severity | Key file(s) |
|---|-----------|----------|-------------|
| 1 | Restored throw-expecting tests run before service throws; controller never gets 404 | BLOCKING | `.../tasks/task.service.test.ts`, `task.service.ts`, `task.controller.ts` |
| 2 | Step 1.1 "restore from HEAD" conflicts with no-`any` (HEAD test has 4 `any`) | BLOCKING | `.../tasks/task.service.test.ts` |
| 3 | MCP split omits `tool.py` (219 lines) and all 3 test files (>200 lines); `index.ts` already exists; new split files undeclared | BLOCKING | `.../mcp/tool.ts`, `audit.ts`, `call.ts`, `tool.py`, `*.test.ts`, `index.ts` |
| 4 | `audit-repository.sql.ts` executionStatus already `"pending"`; 4 default sites in `audit-repository.ts` produce constraint-violating `succeeded`+`none` | BLOCKING | `.../audit-service/src/audit-repository.sql.ts`, `audit-repository.ts`, `audit-repository.test.ts:430-431`, `.../migrations/03-audit-schema.sql` |
| 5 | JWT guard path wrong (`src/approval/grants.controller.ts`); no JWT deps in either service; `extractCallerContext` fails open; breaks direct-call tests | BLOCKING | `.../approval/grants.controller.ts`, `.../policy/policy.controller.ts`, `.../audit/audit.controller.ts`, both `package.json` |
| 6 | `note.repository.ts` lacks `user_id` on `findById`/`delete`; `update()` calls `findById(noteId)`; references untracked migration 33 `note_versions`; overlaps existing note code | BLOCKING | `.../notes/note.repository.ts`, `note.entity.ts`, `.../migrations/33-note-versions.sql` |
| 7 | New MCP split files and guard files are undeclared → `tree_checks` rejects them; baseline layout already fails 4 checks | BLOCKING | `nova/tests/layout/tree_checks.py`, `docs/plan/10-tasks-notes.md` |

**Recommendation:** Do not implement v4 as written. First resolve objections 1, 3, 4, 5, 6, and 7 (ordering, no-`any`, MCP split scope, audit defaults, JWT guard path/deps/tests, notes ripple effects, undeclared files). Re-scope 2.1 to include `tool.py` and the test files, correct 2.2's `audit-repository.sql.ts` premise and enumerate all four default sites, correct 2.4's grant-controller path and add JWT dependencies + test fixtures, and declare every new file in a plan row before running `tree_checks`. Only then proceed to Module 10 task 9.
