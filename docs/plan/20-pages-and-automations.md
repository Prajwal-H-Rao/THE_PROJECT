# Module 20 — Assistant, automations and integration pages

Phase P9. Spec headings: six page rows, allowed task family 7, `integration-registry`, `scheduler-worker`, RBAC.

## Goal

Build the six pages the design spec names and no other module owns. Run automations on a schedule. Show every provider connection with its scopes and a revoke action. Expose reusable components in Storybook.

## Constraints (spec, binding)

- Task family 7 (spec:191): "Integrations, automations, notifications and security: configure supported providers, run predefined schedules, link channels, inspect audit history, and manage the user's own security/session settings under step-up authentication where required."
- Today (spec:403): "Every number links to its source records."
- Assistant (spec:404): "Tool calls and source extracts are separate from assistant prose. Approval cards appear inline but open a detailed approval view."
- Automations (spec:411): "preview changes before enabling; run history shows verified outcomes."
- Integrations (spec:412): "Provider cards with connection status, granted scopes, last sync, reconnect/revoke action and token-expiry/error explanation."
- Activity & Security (spec:413): the audit timeline carries "actor, resource, event, policy result and verification evidence."
- Settings (spec:414) includes model/provider selection and account deletion.
- Storybook (spec:417): "expose reusable component variants in Storybook."
- RBAC (spec:235): "RBAC roles (admin vs user). Policy layer checks each tool call against user's permissions."
- `scheduler-worker` (spec:745) "sends commands through APIs and verifies idempotency keys." It never writes to a domain table directly.

## Build sequence

| # | Task | Artifact | Test | Hrs |
|---|---|---|---|---|
| 1 | Build the Today page: KPI strip, agenda timeline, priority tasks, pending approvals | `apps/web/today/` | Every KPI links to its source record | 7 |
| 2 | Build the Assistant page: 800px conversation column, 320px context rail, sticky composer | `apps/web/assistant/` | Tool results render apart from prose | 8 |
| 3 | Add the conversation API: intake, streaming response, stop, history | `agent-orchestrator/` | Stop cancels without a partial write | 8 |
| 4 | Render approval cards inline with a full detail view | assistant + policy | Detail view shows the payload hash | 5 |
| 5 | Define the automation rule schema: trigger, schedule, permissions, payload, owner | `scheduler-worker/` | Rule without an owner fails | 5 |
| 6 | Build the automation engine on `scheduler-worker` with idempotency keys | scheduler | Two triggers, one run | 7 |
| 7 | Add preview before enabling an automation | web UI | Enable is blocked without preview | 5 |
| 8 | Record run history with verified outcomes only | scheduler + audit | Run row shows `unknown` without evidence | 5 |
| 9 | Add pause, resume and delete for an automation | scheduler | Paused rule never fires | 4 |
| 10 | Enforce automation permissions through the policy service | policy | An automation cannot widen its own scope | 6 |
| 11 | Build the `integration-registry` service: provider, granted scopes, connection status, last sync and revoke | `services/integration-registry/` | Revoking a scope stops the next sync | 8 |
| 12 | Build the Automations page: cards with trigger, permissions, schedule, last run and pause control | `apps/web/automations/` | Each card shows a real last run or an explicit never-run state | 6 |
| 13 | Build the Integrations page from `integration-registry`: status, scopes, last sync, reconnect, revoke | `apps/web/integrations/` | Revoke stops the next sync | 7 |
| 14 | Show token-expiry and error explanations on each provider card | integrations UI | Expiry warning renders before failure | 4 |
| 15 | Build the Activity & Security page: filterable audit timeline, session list, channel identities, alerts | `apps/web/activity/` | Timeline filters by actor and policy result | 7 |
| 16 | Build the Settings page: profile, timezone, locale, appearance, retention, model selection, notifications, 2FA, export, delete | `apps/web/settings/` | Export and delete each complete a full cycle | 9 |
| 17 | Apply the P2 RBAC roles from `07-identity-authz` to every page route and to the privileged Activity and Security endpoints | web UI + policy | A `user` role receives a 403 from each privileged endpoint | 6 |
| 18 | Place the privileged Activity and Security endpoints behind the P5 network rule and separate them in the UI | network rule + UI | No chat path reaches a privileged endpoint | 4 |
| 19 | Expose component variants in Storybook | `.storybook/` | Storybook builds in CI | 5 |
| 20 | Add Storybook interaction tests for the approval card and automation card | Storybook tests | Both tests fail when the card breaks | 5 |
| 21 | Register the family 7 operations: automation runs, notification delivery and audit inspection (spec:191, spec:193) | policy service | An unregistered family 7 operation is denied | 5 |

This build sequence sums to 126 hours.

## Build order

Work these steps in order. A step names tasks from the table above. At 40 hours per week a phase spans several weeks, so a step may run into the next week.

1. Build the Today and Assistant pages with the conversation API.
2. Define the automation schema and run it on `scheduler-worker`.
3. Build Integrations, Activity and Settings, then wire the P2 RBAC roles to every route.

## Acceptance tests

- `test_today_kpi_links_to_source` — each KPI resolves to a real record, not a constant.
- `test_tool_result_separate_from_prose` — the Assistant DOM keeps tool output out of prose.
- `test_automation_runs_once` — two triggers produce one run.
- `test_automation_cannot_widen_scope` — the engine captures the rule's permissions at authoring time and never widens them.
- `test_revoke_stops_next_sync` — a revoked provider fails the next scheduled sync.
- `test_admin_route_denied_for_user_role` — RBAC holds at the policy layer.
- `test_no_chat_path_to_admin` — a chat request cannot reach an admin route.
- `test_storybook_builds` — CI fails if Storybook fails.

## Risks

- The conversation API is the one place where a streaming model response meets the UI. Keep it read-only and let policy gate every action.
- Automations inherit the risk of a scheduled side effect. Every automation runs under a fixed permission set and an idempotency key.
- Storybook is a convenience, not a security control. Ship it after the pages, and drop it first if P9 runs long.
