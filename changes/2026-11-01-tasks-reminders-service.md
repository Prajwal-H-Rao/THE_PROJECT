# 2026-11-01 tasks-reminders-service

## Summary
Module 10 (Tasks, Reminders and Notes) tasks 1-2: task table via migration 06, task CRUD service with ownership checks.

## Changes
- `nova/services/tasks-reminders-service/package.json` — NestJS service scaffold (@nestjs/core, @nestjs/common, @nestjs/platform-fastify, pg, reflect-metadata)
- `nova/services/tasks-reminders-service/nest-cli.json` — NestJS CLI config
- `nova/services/tasks-reminders-service/tsconfig.json` — TypeScript config (NodeNext, strict)
- `nova/services/tasks-reminders-service/src/tasks/task.entity.ts` — Task, CreateTaskInput, UpdateTaskInput, TaskListFilter interfaces
- `nova/services/tasks-reminders-service/src/tasks/task.repository.ts` — TaskRepository with pg Pool, SQL queries against tasks_reminders_service.tasks, ownership filter WHERE user_id = $1 on all reads/updates/deletes
- `nova/services/tasks-reminders-service/src/tasks/task.service.ts` — TaskService CRUD with TaskNotFoundError/TaskForbiddenError enforcement
- `nova/services/tasks-reminders-service/src/tasks/task.controller.ts` — TaskController REST endpoints with x-user-id header ownership binding
- `nova/services/tasks-reminders-service/src/tasks/tasks.module.ts` — TasksModule wiring
- `nova/services/tasks-reminders-service/src/app.module.ts` — AppModule with PG_POOL provider
- `nova/services/tasks-reminders-service/src/main.ts` — NestJS Fastify entry point
- `nova/services/tasks-reminders-service/src/tasks/task.repository.test.ts` — 6 repository tests (create, findById denial, list, status filter, update denial, delete denial)
- `nova/services/tasks-reminders-service/src/tasks/task.service.test.ts` — 5 service tests (create, getTask denial, listTasks empty, updateTask denial, deleteTask denial)
- `repo.md` — updated Module 10 tasks 1-2 status

## Tests
11/11 tests pass across 2 test suites. TypeScript compiles cleanly (strict mode).

## Notes
No DB connection in tests (mock pg Pool). Cross-user read denied at every operation via WHERE user_id = $1. Uses existing migration 06 tasks table. All text via props - no hardcoded strings in components. Files under 200 lines with header comments. ASD-STE100 language in all comments.