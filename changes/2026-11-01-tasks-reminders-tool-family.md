# 2026-11-01 tasks-reminders-tool-family

## Summary
Module 10 (Tasks, Reminders and Notes) task 4: Task tool family MCP catalogue with complete, reschedule, search operations.

## Changes
- `nova/packages/contracts/mcp/catalogue/tasks.json` — New MCP catalogue with 3 task operations (complete, reschedule, search) NOT covered by calendar_tasks.json (which has create_task and read). owning_service: tasks-reminders-service per spec line 739. Risk tiers: complete=tier2, reschedule=tier2, search=tier1. Verifiers: verify_tasks_complete, verify_tasks_reschedule, verify_tasks_search. Description strings in ASD-STE100 (short active sentences). File under 200 lines. Out-of-scope ops denied by omission (format matches existing catalogue convention).

## Tests
JSON validated as syntactically valid. 3 operations registered. No duplicate operations with calendar_tasks.json.

## Notes
No duplicate with calendar_tasks.json (create_task and read already exist there). owning_service correctly names tasks-reminders-service per spec line 739. Verifier naming follows verify_<family>_<op> pattern. ASD-STE100 descriptions are short active sentences with one idea each. File is 150 lines, under the 200-line limit.