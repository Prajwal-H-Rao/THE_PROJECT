# Layout difference between the catalogue and the layout

## Scope

The table compares the catalogue at spec:721 with the layout at spec:913. The table holds only the differences. The entries that match by name produce no row. The catalogue holds 23 entries. The layout holds 22 deployable paths. Exactly 15 units match by exact name. Exactly 5 units match under a different name. Exactly 3 catalogue entries have no layout path. Exactly 3 layout paths have no catalogue entry. Non-deployable layout directories are out of scope. The table does not diff the live tree against the spec layout. The tree holds 200 directories below the root. The tree holds 126 leaf directories. The tree holds 43 .gitkeep placeholder files.

## Precedence

The catalogue wins on count and on responsibility. The layout wins on directory shape.

## Differences

| # | Kind | Catalogue entry | Layout path | Note |
|---|---|---|---|---|
| 1 | catalogue-only | employer-registry-service | none | The catalogue entry sits at spec:735. The layout names no directory for employer-registry-service. Module 13 task 1 creates `services/employer-registry-service/import/`. |
| 2 | catalogue-only | job-source-worker | none | The catalogue entry sits at spec:736. The layout names no directory for job-source-worker. The plan names no path under `job-source-worker`. The table row at docs/plan/12-jobs-agent.md:40 names `job-source-worker` for the adapters and polling work. Module 13 task 6 carries the `worker` artifact. Module 13 task 7 carries the `connectors/` artifact. Module 13 tasks 8 to 11 carry the `connector` artifact. Module 13 task 13 carries the `connector` artifact. Module 13 task 15 carries the `worker` artifact. Module 13 task 16 carries the `worker` artifact. |
| 3 | catalogue-only | integration-registry | none | The catalogue entry sits at spec:747. The layout names no directory for integration-registry. Module 20 task 11 creates `services/integration-registry/`. |
| 4 | layout-only | none | services/ml-service | The layout path sits at spec:938. Module 06 task 16 wires `workers/inference-worker/` and its `services/ml-service/` API. Module 06 task 21 writes `services/ml-service/resume/`. Module 10 task 12 wires `services/ml-service/`. |
| 5 | layout-only | none | workers/document-worker | The layout path sits at spec:944. Module 06 task 10 provisions `workers/document-worker/`. |
| 6 | renamed | web-app | apps/web | The catalogue entry sits at spec:727. The layout path sits at spec:920. Module 01 task 15 scaffolds `apps/web/`. |
| 7 | renamed | api-gateway-bff | services/api-gateway | The catalogue entry sits at spec:728. The layout path sits at spec:922. Module 01 task 4 builds `services/api-gateway/`. |
| 8 | renamed | channel-adapter-telegram | services/telegram-adapter | The catalogue entry sits at spec:743. The layout path sits at spec:939. Module 14 task 6 builds the `telegram` adapter. The plan names no `services/telegram-adapter/` path. |
| 9 | renamed | channel-adapter-whatsapp | services/whatsapp-adapter | The catalogue entry sits at spec:744. The layout path sits at spec:940. Module 14 task 1 builds `services/whatsapp-adapter/`. |
| 10 | renamed | audit-activity-service | services/audit-service | The catalogue entry sits at spec:746. The layout path sits at spec:941. Module 02 task 5 starts the audit service. Module 02 task 16 builds the audit search. The plan names no `services/audit-service/` path. |
| 11 | layout-only | none | services/agent-orchestrator/orchestrator/verify/verifier.py | The layout path is a new implementation for Layer 7 verification (Module 04 Task 9). The catalogue has no entry for this specific verification module; it is part of the orchestrator runtime. The layout path sits at spec:927. |

## Deferred cloud

The directory `infra/terraform/aws/` holds only a placeholder. No plan task writes content in it. The spec marks the cloud lab optional at docs/plan/order-and-constraints.md:35. The deferral leaves four spec items at docs/plan/order-and-constraints.md:38. The deferral covers spec:955, spec:835, spec:441 and spec:680. The plan does not defer `infra/k8s/overlays/eks/`. Module 17 task 13 owns `infra/k8s/overlays/`.

## Omitted files

The tree omits 0 files that the spec names.

## Extra paths

This task adds 18 path groups beyond the spec layout. The first is docs/layout-diff.md. The second is the two implied parents infra/k8s/overlays/ and infra/terraform/. The third is tests/layout/ with spec_index.py, diff_doc.py, plan_index.py, tree_checks.py, diff_checks.py, copy_checks.py, claims_checks.py, record_claims.py, record_paths.py, plan_checks.py, ci_checks.py, ci_mutations.py, source_checks.py, repo_checks.py, ignored_paths.py, mutations.py, path_mutations.py, plan_mutations.py, record_mutations.py, cases.py, check_layout.py and test_layout_checks.py. The fourth is the .gitkeep placeholder files that mark the empty directories. The fifth is the repo-root .gitignore, the pyproject.toml and the .github/workflows/ci.yml. The sixth is the services/_template/ service skeleton. The seventh is the design notes docs/design-notes/nova-api-gateway.md, docs/design-notes/nova-object-store.md, docs/design-notes/nova-llm-model-provider.md, docs/design-notes/nova-backend-python.md, docs/design-notes/nova-validation.md, docs/design-notes/nova-database.md, docs/design-notes/nova-queue.md, docs/design-notes/nova-python-workers.md, docs/design-notes/nova-frontend.md, docs/design-notes/nova-auth.md, docs/design-notes/nova-agent-workflow.md, docs/design-notes/nova-mcp-surface.md, docs/design-notes/nova-model-gateway.md, docs/design-notes/nova-document-parsing.md, docs/design-notes/nova-observability.md, docs/design-notes/nova-packaging.md, docs/design-notes/nova-orchestration.md, docs/design-notes/nova-monitoring.md, docs/design-notes/nova-approval-grants.md, docs/design-notes/nova-export-deletion.md. The eighth is the public edge infra/edge/Caddyfile and infra/edge/README.md. The ninth is the migration tooling packages/contracts/migrations/runner.ts, packages/contracts/migrations/runner.test.ts, packages/contracts/migrations/01-roles-and-schemas.sql, packages/contracts/migrations/02-identity-schema.sql, packages/contracts/migrations/03-audit-schema.sql, packages/contracts/migrations/04-policy-schema.sql, packages/contracts/migrations/05-inbox-schema.sql, packages/contracts/migrations/06-tasks-schema.sql, packages/contracts/migrations/07-finance-schema.sql, packages/contracts/migrations/08-trips-schema.sql, packages/contracts/migrations/09-jobs-schema.sql, packages/contracts/migrations/10-registry-schema.sql, packages/contracts/migrations/11-export-deletion.sql, packages/contracts/migrations/12-indexes.sql, packages/contracts/migrations/13-audit-search.sql, packages/contracts/migrations/14-password-reset-tokens.sql, packages/contracts/migrations/15-refresh-tokens.sql, packages/contracts/migrations/16-scopes.sql, packages/contracts/migrations/17-resource-ownership.sql, packages/contracts/migrations/18-key-rotation.sql, packages/contracts/migrations/19-account-linking.sql, packages/contracts/migrations/20-unlink-revoke.sql, packages/contracts/migrations/21-rate-limiting.sql, packages/contracts/migrations/22-cors-csp-limits-ssrf.sql, packages/contracts/migrations/23-rbac-roles.sql, packages/contracts/migrations/24-approval-grants.sql, packages/contracts/migrations/25-approval-card.sql. The tenth is the event envelope packages/contracts/events/event-envelope.ts, packages/contracts/events/event-consumers.ts, packages/contracts/events/event-envelope.test.ts, packages/contracts/events/event-consumers.test.ts, packages/contracts/events/event-envelope.compat.test.ts, packages/contracts/grant-verification.ts, packages/contracts/grant-verification.test.ts. The eleventh is the backup scripts infra/scripts/backup.sh, infra/scripts/restore.sh, infra/scripts/backup-drill.sh, docs/privacy-review.md. The twelfth is the lab harness labs/lab01/validate-openapi.js, labs/lab01/fixtures/api-gateway-health-live.json, labs/lab01/fixtures/api-gateway-health-ready.json, labs/lab01/fixtures/typescript-template-health-live.json, labs/lab01/fixtures/typescript-template-health-ready.json, labs/registry.yaml. The thirteenth is the third-party dependency record THIRD_PARTY.md. The fourteenth is the labs CI workflow .github/workflows/labs.yml. The fifteenth is the identity service services/identity-service/nest-cli.json, services/identity-service/package.json, services/identity-service/package-lock.json, services/identity-service/tsconfig.json, services/identity-service/src/app.module.ts, services/identity-service/src/main.ts, services/identity-service/src/auth/auth.controller.ts, services/identity-service/src/auth/auth.module.ts, services/identity-service/src/auth/oidc.service.ts, services/identity-service/src/auth/oidc-state.store.ts, services/identity-service/src/db/db.module.ts, services/identity-service/src/health/health.controller.ts, services/identity-service/src/health/health.module.ts, services/identity-service/src/session/session.module.ts, services/identity-service/src/session/session.repository.ts, services/identity-service/src/session/session.service.ts, services/identity-service/src/session/session.tokens.ts, services/identity-service/src/session/session.tokens.test.ts, services/identity-service/src/account/account.module.ts, services/identity-service/src/account/user.repository.ts, services/identity-service/src/totp/totp.controller.ts, services/identity-service/src/totp/totp.module.ts, services/identity-service/src/totp/totp.service.ts. The sixteenth is the policy approval service services/policy-approval-service/nest-cli.json, services/policy-approval-service/package.json, services/policy-approval-service/package-lock.json, services/policy-approval-service/tsconfig.json, services/policy-approval-service/src/app.module.ts, services/policy-approval-service/src/main.ts, services/policy-approval-service/src/approval/grant-binding.ts, services/policy-approval-service/src/approval/grant-card.ts, services/policy-approval-service/src/approval/grant-creation.ts, services/policy-approval-service/src/approval/grant-outcomes.ts, services/policy-approval-service/src/approval/grants.service.ts, services/policy-approval-service/src/approval/grants.controller.ts, services/policy-approval-service/src/approval/grants.module.ts, services/policy-approval-service/src/approval/grants.test.ts, services/policy-approval-service/src/policy/policy-schema.ts, services/policy-approval-service/src/policy/policy-loader.ts, services/policy-approval-service/src/policy/policy-loader.test.ts, services/policy-approval-service/src/policy/policy-decision.service.ts, services/policy-approval-service/src/policy/policy-decision.service.test.ts, services/policy-approval-service/src/policy/policy-schema.test.ts, services/policy-approval-service/src/policy/policy.controller.ts, services/policy-approval-service/src/policy/policy.module.ts, services/policy-approval-service/src/policy/families.yaml, services/policy-approval-service/src/health/health.controller.ts, services/policy-approval-service/src/health/health.module.ts, services/policy-approval-service/src/approval/grant-repository.ts, services/policy-approval-service/src/approval/grant-repository-types.ts. The seventeenth is the audit service services/audit-service/nest-cli.json, services/audit-service/package.json, services/audit-service/package-lock.json, services/audit-service/tsconfig.json, services/audit-service/src/app.module.ts, services/audit-service/src/main.ts, services/audit-service/src/audit-repository.ts, services/audit-service/src/audit.controller.ts, services/audit-service/src/audit.module.ts, services/audit-service/src/audit.service.ts, services/audit-service/src/health/health.controller.ts, services/audit-service/src/health/health.module.ts. The eighteenth is the architecture records docs/architecture/layout-diff.md and docs/architecture/service-map.md. The allow-list holds apps/web, db, evals, evals/model-eval, evals/model-eval/eval-sets, labs, services/analytics-service, services/calendar-service, services/channels-service, services/content-service, services/document-service, services/deployment-service, services/employer-registry-service, services/finance-service, services/inbox-service, services/jobs-service, services/messages-service, services/ml-service, services/release-gate-service, services/resilience-service, services/tasks-reminders-service, tests/layout, workers/document-worker, workers/inference-worker and workers/web-worker. The always ignored names are __pycache__, node_modules, .next, .turbo, .venv, venv, .pytest_cache, .mypy_cache and .ruff_cache. The ignored output names are build, coverage, dist, htmlcov, playwright-report, storybook-static and test-results. The ignored directory suffixes are .egg-info. The ignored files are .coverage, next-env.d.ts and package-lock.json. The ignored temporary files are type_error_proof.py. The ignored file suffixes are .pyc, .pyo and .tsbuildinfo. The tree holds 200 directories below the root. The tree holds 126 leaf directories. The tree holds 43 .gitkeep placeholder files.

## Partition closes

The layout paths that close their partitions are: apps/web, services/agent-orchestrator/orchestrator/verify/verifier.py, services/api-gateway, services/audit-service, services/ml-service, services/telegram-adapter, services/whatsapp-adapter, workers/document-worker. These paths are closed in the sense that no further layout children are expected below them. The checker verifies that no unexpected descendants exist.

## Note evidence

Each row in the layout diff must cite the spec line that motivates it. Row 11 cites services/agent-orchestrator/orchestrator/verify/verifier.py at spec:216.

## Authoritative copy

The record is nova/docs/layout-diff.md. The checker validates it. Module 01 task 16 writes the copy to `nova/docs/architecture/layout-diff.md`. The copy holds the same 11 rows. The checker compares the kind, the catalogue entry and the layout path of every row. The copy may cite no spec line that the record row does not cite. The checker fails when the copy file holds no layout diff table. The checker reports that no copy exists while the copy file is absent. Any other table under nova/docs/architecture/ that carries the same columns must match the record as well. Module 01 task 16 owns the service map. The plan test for that task requires each of the 23 catalogue services to appear exactly once.

## Scope claims

The layout diff makes these scope claims:
- 3 catalogue entries have no layout path (employer-registry-service, job-source-worker, integration-registry).
- 3 layout paths have no catalogue entry (services/ml-service, workers/document-worker, services/agent-orchestrator/orchestrator/verify/verifier.py).
- 5 renamed pairs (web-app, api-gateway-bff, channel-adapter-telegram, channel-adapter-whatsapp, audit-activity-service).
- 3 layout-only paths (services/ml-service, workers/document-worker, services/agent-orchestrator/orchestrator/verify/verifier.py).
- 3 catalogue-only entries (employer-registry-service, job-source-worker, integration-registry).
- The tree holds 200 directories below the root, 126 leaf directories and 43 .gitkeep placeholder files.
- 43 .gitkeep placeholder files.
- 126 leaf directories.

## Tree files

The tree holds 200 directories below the root. The tree holds 126 leaf directories and 43 placeholders. The following files are explicitly declared and must exist: services/agent-orchestrator/orchestrator/verify/verifier.py. The checker validates their presence and that no undeclared files exist.

## Allow-list

The allow-list for tree file checks includes: .gitignore, .gitkeep, pyproject.toml, .github/workflows/ci.yml, docs/layout-diff.md, nova/docs/architecture/layout-diff.md, pyproject.toml, .github/workflows/ci.yml, data/employer-seed-v1.csv, services/_template/, services/agent-orchestrator/orchestrator/verify/verifier.py.

The directory allow-list is also an ownership boundary. The record names no single file under the directory allow-list prefixes. A file under a listed prefix belongs to the module task that owns the prefix. The undeclared-file check skips these files on purpose. The module tasks of the prefix owner govern them.

## Spec citations

Each diff row cites a spec line. Row 11 cites spec:927 for the verifier module.

## Plan citations

Each row in the layout diff that references a plan task cites the plan task. Row 11 cites Module 04 Task 9.

## Record sections

The record contains these sections: Scope, Precedence, Differences, Partition closes, Omitted files, Extra paths, Note evidence, Authoritative copy, Scope claims, Tree files, Allow-list, Spec citations, Plan citations, Authoritative copy, Record sections, CI workflow, Plan citations. The checker validates each section exists.

## CI workflow

The CI workflow at .github/workflows/ci.yml runs the layout checker. It must pass on every PR.
