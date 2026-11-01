# 2026-11-01 module-10-tasks-restore-error-handling

## Summary
Reverted destructive uncommitted changes to Module 10 tasks domain (nova/services/tasks-reminders-service/src/tasks/): restored error handling and deleted test files, fixed mislabeled headers, removed `any` usages. No files outside tasks/ were touched.

## Changes
- `nova/services/tasks-reminders-service/src/tasks/task.service.ts` — restored from HEAD: TaskNotFoundError/TaskForbiddenError, getTask/updateTask/deleteTask throw on not-found, purpose comments restored; header is ASD-STE100 compliant
- `nova/services/tasks-reminders-service/src/tasks/task.service.test.ts` — restored from HEAD then rewritten: all 4 `any` usages replaced with typed Pool (`{} as unknown as Pool`) and TaskRepository signatures (TaskListFilter, CreateTaskInput, UpdateTaskInput); throw-expecting tests kept
- `nova/services/tasks-reminders-service/src/tasks/recurrence-parser.ts` — restored from HEAD; header fixed from "Nova design system" to ASD-STE100 sentence
- `nova/services/tasks-reminders-service/src/tasks/recurrence-service.ts` — restored from HEAD; header fixed from "Nova design system" to ASD-STE100 sentence
- `nova/services/tasks-reminders-service/src/tasks/recurrence-parser.test.ts` — restored from HEAD
- `nova/services/tasks-reminders-service/src/tasks/recurrence-service.test.ts` — restored from HEAD
- `nova/services/tasks-reminders-service/src/tasks/task.repository.test.ts` — restored from HEAD
- `nova/services/tasks-reminders-service/src/tasks/task.repository.ts` — header fixed from "Nova design system" to ASD-STE100 sentence; working-tree body preserved (TASKS_TABLE, ORDER BY updated_at DESC)
- `nova/services/tasks-reminders-service/src/tasks/task.controller.ts` — header fixed from "Nova design system" to ASD-STE100 sentence; working-tree body preserved
- `nova/services/tasks-reminders-service/src/tasks/task.entity.ts` — header fixed from "Nova design system" to ASD-STE100 sentence
- `repo.md` — added Module 10 tasks 1-8 status to NOVA build status

## Tests
`tsc --noEmit` exit 0; `tsc` build exit 0; `npm test` → 28 tests, 4 suites, 0 failures. No `any` remains in tasks/. All files under 200 lines with header comments. ASD-STE100 language throughout.

## Notes
Working-tree body changes preserved intentionally (task.repository.ts ORDER BY updated_at DESC and TASKS_TABLE constant; task.controller.ts body). This is a partial revert targeting only destructive changes: stripped error handling, deleted files, and "Nova design system" mislabeled headers. Per-user ownership (WHERE user_id = $1) remains enforced on all reads/updates/deletes.
