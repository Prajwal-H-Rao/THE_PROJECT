# Copy of the layout difference record

## About this copy

This document is the copy of the record at `nova/docs/layout-diff.md` that
module 01 task 16 owns. The checker at `tests/layout/copy_checks.py` compares
every row of this copy against the record. The copy holds the same 10 rows in
the same order. The notes repeat the note text of the record, so no note cites
a spec line that the record does not cite.

## Differences

| # | Kind | Catalogue entry | Layout path | Note |
|---|------|-----------------|-------------|------|
| 1 | catalogue-only | employer-registry-service | none | The catalogue entry sits at spec:735. The layout names no directory for employer-registry-service. Module 13 task 1 creates `services/employer-registry-service/import/`. |
| 2 | catalogue-only | job-source-worker | none | The catalogue entry sits at spec:736. The layout names no directory for job-source-worker. The plan names no path under `job-source-worker`. The table row at docs/plan/12-jobs-agent.md:40 names `job-source-worker` for the adapters and polling work. Module 13 task 6 carries the `worker` artifact. Module 13 task 7 carries the `connectors/` artifact. Module 13 tasks 8 to 11 carry the `connector` artifact. Module 13 task 13 carries the `connector` artifact. Module 13 task 15 carries the `worker` artifact. Module 13 task 16 carries the `worker` artifact. |
| 3 | catalogue-only | integration-registry | none | The catalogue entry sits at spec:747. The layout names no directory for integration-registry. Module 20 task 11 creates `services/integration-registry/`. |
| 4 | layout-only | none | services/ml-service | The layout path sits at spec:935. Module 06 task 16 wires `workers/inference-worker/` and its `services/ml-service/` API. Module 06 task 21 writes `services/ml-service/resume/`. Module 10 task 12 wires `services/ml-service/`. |
| 5 | layout-only | none | workers/document-worker | The layout path sits at spec:941. Module 06 task 10 provisions `workers/document-worker/`. |
| 6 | renamed | web-app | apps/web | The catalogue entry sits at spec:727. The layout path sits at spec:920. Module 01 task 15 scaffolds `apps/web/`. |
| 7 | renamed | api-gateway-bff | services/api-gateway | The catalogue entry sits at spec:728. The layout path sits at spec:922. Module 01 task 4 builds `services/api-gateway/`. |
| 8 | renamed | channel-adapter-telegram | services/telegram-adapter | The catalogue entry sits at spec:743. The layout path sits at spec:936. Module 14 task 6 builds the `telegram` adapter. The plan names no `services/telegram-adapter/` path. |
| 9 | renamed | channel-adapter-whatsapp | services/whatsapp-adapter | The catalogue entry sits at spec:744. The layout path sits at spec:937. Module 14 task 1 builds `services/whatsapp-adapter/`. |
| 10 | renamed | audit-activity-service | services/audit-service | The catalogue entry sits at spec:746. The layout path sits at spec:938. Module 02 task 5 starts the audit service. Module 02 task 16 builds the audit search. The plan names no `services/audit-service/` path. |

## Use

The service map at `service-map.md` in this folder names every catalogue entry
once. When a plan task lands a path, the record and this copy change together.
