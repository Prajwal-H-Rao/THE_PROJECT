# NEGATOR REPORT — Approach Option A (restore + stabilize + Module 10 task 9)

**Verdict: APPROACH FLAWED** — multiple blocking objections found. Do not proceed as written.

The approach mixes accurate restorations with inaccurate premises, rule violations, missing pieces, and ordering problems. Objections below are numbered, each with specific file paths and evidence verified against the working tree and HEAD (commit 14c32e8).

---

## 1. Restoring task.service.test.ts from HEAD violates the no-`any` rule

**Files:** `nova/services/tasks-reminders-service/src/tasks/task.service.test.ts`

Step 1 says restore deleted files from HEAD, verbatim. HEAD `task.service.test.ts` uses `any` in four places:
- `new TaskRepository({} as any)`
- `repo.list = async (_userId: string, _filter?: any) =>`
- `repo.create = async (_userId: string, input: any) =>`
- `repo.update = async (_userId: string, _taskId: string, input: any) =>`

**Project rule:** "No `any` type usage in any TypeScript file." You cannot both restore this file verbatim (Step 1) and comply with the no-`any` rule. To comply, the file must be rewritten, which contradicts "restore from HEAD." This is a direct rule conflict.

## 2. Step 2 is a restore-to-HEAD, not new work; tests break between Step 1 and Step 2

**Files:** `nova/services/tasks-reminders-service/src/tasks/task.service.ts`

HEAD `task.service.ts` (commit 14c32e8) ALREADY defines `TaskNotFoundError` and `TaskForbiddenError`, and `getTask`/`updateTask`/`deleteTask` already throw. The working-tree version stripped these (returns `Task | null` / `Promise<boolean>`). So Step 2 "re-add" is actually a restore to HEAD behavior, not new implementation.

**Ordering problem:** Step 1 restores `task.service.test.ts` (which expects thrown `TaskNotFoundError`) BEFORE Step 2 makes the service throw. Between those steps the restored tests fail against the stripped service. The approach lists Step 1 before Step 2 with no test-fix window.

**Related mismatch:** `task.controller.ts` (lines 56-60, 89-93, 108-112) already catches `TaskNotFoundError` and converts to `NotFoundException`, but the working-tree service never throws it — so not-found currently returns HTTP 200 with a null body instead of 404. Step 2 fixes this only if applied before tests run.

## 3. Objection 4a is incomplete and based on wrong premises

**Files:** `nova/packages/contracts/mcp/call.ts`, `nova/packages/contracts/mcp/audit.ts`, `nova/packages/contracts/mcp/tool.ts`, `nova/services/policy-approval-service/src/policy/families/`

Step 4a lists `call.ts` (233), `audit.ts` (247), `families.yaml` (239) for splitting. Verified line counts:
- `call.ts` = 213 lines (over 200, count slightly off)
- `audit.ts` = 243 lines (over 200)
- `tool.ts` = **268 lines (over 200) but OMITTED from 4a's list** — the approach would leave `tool.ts` violating the 200-line rule.
- `families.yaml` **does not exist as a file.** There is a `families/` directory with seven per-family YAML files (`calendar_tasks`, `finance`, `inbox`, `integrations`, `notes_memory`, `resume_jobs`, `trips`), each under 100 lines (max 93). The families are ALREADY split. The approach's premise is wrong.

So 4a is incomplete (misses `tool.ts`) and incorrect (references a non-existent `families.yaml`).

## 4. Objection 4c's enum alignment is already done; only the defaults need fixing

**Files:** `nova/packages/contracts/audit-contracts.ts`, `nova/packages/contracts/mcp/audit-types.ts`, `nova/services/audit-service/src/audit-repository.ts`

Step 4c part 1 (align `ExecutionStatus` to the 8 spec states) is ALREADY satisfied:
- `audit-contracts.ts:5` defines `ExecutionStatus` with all 10 values including `planned`, `awaiting_approval`, `approved`, `executing`, `succeeded`, `failed`, `cancelled`, `needs_manual_action`.
- `audit-types.ts:41-51` defines `MCPExecutionStatus` with the same 10 values.

The real, unresolved issue is part 2: `audit-repository.ts` defaults `executionStatus ?? "succeeded"` and `verificationType ?? "none"` at lines 43-44, 61-62, 133-134, 151-152. This produces the forbidden `succeeded`+`none` combination that violates the DB check constraint in `03-audit-schema.sql:41-46`. The approach treats enum alignment as a blocker, but the enum is already aligned; the constraint-violating defaults are the actual work.

## 5. Objection 4f's migration premise is wrong; duplicate branch 26 is not a runner failure

**Files:** `nova/packages/contracts/migrations/26-audit-dedupe-extended-enums.sql`, `nova/packages/contracts/migrations/26-reminders-schema.sql`, `nova/packages/contracts/migrations/runner.ts`

Step 4f claims `26-reminders-schema.sql` is "uncommitted" while `26-audit-dedupe-extended-enums.sql` is committed. Verified: **BOTH are committed in HEAD** (`git ls-tree HEAD` lists both; `git status` shows neither as modified). The approach gets the committed status wrong.

Functionally, the runner keys `_migrations` by full filename `name` (runner.ts:58-59), not by branch number. Duplicate branch "26" does not break `migrate()` — both apply in filename sort order. Renumbering is reasonable cleanup, but the approach overstates it as a functional blocker.

## 6. Migration 06/31 inconsistency — duplicate tags GIN index (Module 10 task 9)

**Files:** `nova/packages/contracts/migrations/06-tasks-schema.sql`, `nova/packages/contracts/migrations/31-notes-fulltext.sql`

Step 5 says "verify migration 06/31 consistency." There IS an inconsistency the approach misses:
- Migration `06-tasks-schema.sql:44` already creates `idx_notes_tags ON notes_memory_service.notes USING GIN (tags)`.
- Migration `31-notes-fulltext.sql:10-11` creates `idx_notes_tags_gin ON notes_memory_service.notes USING GIN (tags)` — a DUPLICATE tags GIN index (different name, same column and operator class).

Running both migrations creates a redundant duplicate index. The approach's "verify consistency" must flag and remove this duplication before Module 10 task 9 is considered complete.

## 7. Objection 4g misses that mypy==2.4.0 does not exist (CI will not install)

**File:** `.github/workflows/ci.yml`

Step 4g says fix CI order so Python requirements install before mypy. But ci.yml:30 pins `mypy==2.4.0`. mypy is at 1.x as of 2026; version 2.4.0 does not exist on PyPI. The `pip install` step would FAIL entirely before mypy ever runs. Reordering requirements before mypy does not fix a nonexistent package version. The approach's 4g addresses order but not the invalid version pin, so CI remains broken.

## 8. Objection 4b JWT guards conflict with existing behavior and would break tests

**Files:** `nova/services/policy-approval-service/src/approval/grants.controller.ts`, `nova/services/policy-approval-service/src/policy/policy.controller.ts`, `nova/services/audit-service/src/audit.controller.ts`

Step 4b wants JWT guards so unauthenticated calls are rejected. Verified current state:
- `grants.controller.ts` (`/policy/grants*`) has **zero authentication** — no auth imports, no guards.
- `policy.controller.ts` `/policy/decide` and `/policy/decide/bulk` use manual `extractCallerContext` (policy.controller.ts:19-35) which FAILS OPEN to `{service:"unknown", scopes:[]}` when no token is present. Unauthenticated calls are NOT rejected — they get an anonymous caller. This contradicts 4b's goal.
- `audit-service` (`audit.controller.ts`) has zero authentication — confirmed by grep (only match is `reason: "not_authorized"` in a test payload).

Adding NestJS JWT guards would break existing tests (e.g. `policy-decision.service.test.ts` calls services directly with no tokens). The approach mentions "test fixtures" but does not specify how guards integrate with the existing manual `verifyToken` in `policy.controller.ts` and `policy-admin.controller.ts` — risk of double authentication or broken tests. Token fixtures would also need to be added for every existing endpoint test.

## 9. Module 10 task 9 overlaps with existing in-flight notes code

**Files:** `nova/services/tasks-reminders-service/src/notes/note.entity.ts`, `nova/services/tasks-reminders-service/src/notes/note.repository.ts`

`nova/services/tasks-reminders-service/src/notes/` already exists (untracked) with `note.entity.ts` (39 lines) and `note.repository.ts` (187 lines, near the 200-line limit). `note.repository.ts` references `notes_memory_service.note_versions` from migration 33 (untracked) and its `findById` does NOT filter by `user_id` — an ownership-enforcement gap unlike `task.repository.ts`.

Step 5's "add note service scaffold + tests" would duplicate or conflict with this existing in-flight code. The approach must reconcile with `note.repository.ts`/`note.entity.ts` before adding a note service.

## 10. Line-limit risk for new Module 10 and guard code

**Files:** `nova/services/tasks-reminders-service/src/notes/note.repository.ts`, plus new guard/note-service files to be created.

The project rule caps every file at 200 lines with a header comment and one-line purpose per function. `note.repository.ts` is already 187 lines. Adding a note service, note controller, tests, JWT guard files, and split MCP contract files all within 200 lines each is feasible but the approach gives no plan showing how each new file stays under the limit. Without that, new files risk exceeding 200 lines and failing `tree_checks.py`.

## 11. Header comment standard is inconsistently applied

**Files:** `nova/services/tasks-reminders-service/src/tasks/task.entity.ts`, `task.repository.ts`, `task.service.ts`, `task.controller.ts`, `nova/services/tasks-reminders-service/src/notes/*.ts`

Steps 2 and 3 say restore headers and one-line purpose comments, but the current working-tree headers all say "Nova design system" (a mislabel for task/note domain files). The HEAD versions had proper domain headers. Restoring from HEAD fixes `task.repository.ts` and `task.service.ts`, but `note.entity.ts`/`note.repository.ts` still carry the "Nova design system" mislabel. The approach does not address the notes files' headers, leaving an inconsistency.

---

## Summary of blocking objections

| # | Objection | Severity | Key file(s) |
|---|-----------|----------|-------------|
| 1 | Restoring `task.service.test.ts` from HEAD brings `any` types; violates no-`any` rule | BLOCKING | `.../tasks/task.service.test.ts` |
| 2 | Step 2 is restore-to-HEAD; tests fail between Step 1 and Step 2 | BLOCKING | `.../tasks/task.service.ts` |
| 3 | 4a incomplete: misses `tool.ts` (268 lines); `families.yaml` does not exist (already split) | BLOCKING | `.../mcp/tool.ts`, `.../mcp/call.ts`, `.../mcp/audit.ts` |
| 4 | 4c enum alignment already done; only `succeeded`+`none` defaults need fixing | BLOCKING | `.../audit-repository.ts` |
| 5 | 4f premise wrong: both `26-` migrations are committed; duplicate branch 26 is not a runner failure | MAJOR | `.../migrations/26-*` |
| 6 | Migration 06/31: duplicate `tags` GIN index (`idx_notes_tags` vs `idx_notes_tags_gin`) | BLOCKING | `.../migrations/06-tasks-schema.sql`, `31-notes-fulltext.sql` |
| 7 | 4g misses `mypy==2.4.0` nonexistent pin; CI install fails regardless of order | BLOCKING | `.github/workflows/ci.yml` |
| 8 | 4b: grants endpoints and audit-service have zero auth; decide/bulk fail open; guards break existing tests | BLOCKING | `.../grants.controller.ts`, `.../policy.controller.ts`, `.../audit.controller.ts` |
| 9 | Module 10 task 9 duplicates existing in-flight `notes/` code; `note.repository.ts` lacks `user_id` filter | BLOCKING | `.../notes/note.repository.ts`, `note.entity.ts` |
| 10 | No plan showing new guard/note/split files stay under 200 lines | MAJOR | new files |
| 11 | "Nova design system" header mislabel persists in notes files | MAJOR | `.../notes/*.ts` |

**Recommendation:** Do not implement as written. First fix objections 1, 3, 6, 7, 8, 9 (rule violations, broken premises, duplicate index, nonexistent mypy pin, missing auth, overlapping notes code). Then re-scope 4a to include `tool.ts` and drop the nonexistent `families.yaml`, re-scope 4c to only the defaults fix, and renumber one `26` migration as cleanup (not a runner blocker). Only then proceed to Module 10 task 9.
