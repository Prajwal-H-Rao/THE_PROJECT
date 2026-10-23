# Service map of the NOVA catalogue

## Scope

The map lists the 23 catalogue entries at spec:721 with the tree paths of the
layout at spec:913. Each catalogue entry appears exactly once. The map marks the
trust boundary of each unit and the role it plays in the data flow. The three
catalogue entries with no tree path stay on the map. The two layout paths with
no catalogue entry appear in their own list below the table.

## Boundaries

The map uses four boundary names. The user edge holds the browser client at
`apps/web/`. The edge service holds `services/api-gateway/`. Only that service
issues service tokens and reaches into the service network from the outside.
The queue workers run jobs that the broker delivers. Every other unit is a data
or an outbound service inside the service network.

## Services

| # | Service | Tree path | Boundary | Role |
|---|---------|-----------|----------|------|
| 1 | web-app | apps/web | user edge | the browser client |
| 2 | api-gateway-bff | services/api-gateway | edge | issues tokens and gates requests |
| 3 | identity-service | services/identity-service | data | owns identity data |
| 4 | agent-orchestrator | services/agent-orchestrator | data | plans agent work |
| 5 | model-gateway | services/model-gateway | outbound | fronts the model providers |
| 6 | inference-worker | workers/inference-worker | worker | runs inference jobs |
| 7 | document-service | services/document-service | data | owns documents |
| 8 | jobs-service | services/jobs-service | data | owns job records |
| 9 | employer-registry-service | none yet | data | planned by module 13 |
| 10 | job-source-worker | none yet | worker | planned by module 13 |
| 11 | inbox-service | services/inbox-service | data | owns inbox rows |
| 12 | calendar-service | services/calendar-service | data | owns calendar rows |
| 13 | tasks-reminders-service | services/tasks-reminders-service | data | owns task rows |
| 14 | notes-memory-service | services/notes-memory-service | data | owns notes |
| 15 | finance-service | services/finance-service | data | owns money rows |
| 16 | trips-service | services/trips-service | data | owns trip rows |
| 17 | channel-adapter-telegram | services/telegram-adapter | outbound | sends telegram messages |
| 18 | channel-adapter-whatsapp | services/whatsapp-adapter | outbound | sends whatsapp messages |
| 19 | policy-approval-service | services/policy-approval-service | data | owns approvals |
| 20 | audit-activity-service | services/audit-service | data | owns the audit trail |
| 21 | integration-registry | none yet | data | planned by module 20 |
| 22 | notification-service | services/notification-service | outbound | sends notifications |
| 23 | scheduler-worker | workers/scheduler-worker | worker | schedules due jobs |

## Paths with no catalogue entry

The layout holds two deployable paths with no catalogue entry at spec:721. The
first is `services/ml-service/`, which module 06 wires. The second is
`workers/document-worker/`, which module 06 provisions. The record at
`docs/layout-diff.md` holds the full difference table.
