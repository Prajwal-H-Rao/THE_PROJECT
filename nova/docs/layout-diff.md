# Layout difference between the catalogue and the layout

## Scope

The table compares the catalogue at spec:717 with the layout at spec:909. The table holds only the differences. The entries that match by name produce no row. The catalogue holds 23 entries. The layout holds 22 deployable paths. Exactly 15 units match by exact name. Exactly 5 units match under a different name. Exactly 3 catalogue entries have no layout path. Exactly 2 layout paths have no catalogue entry. Non-deployable layout directories are out of scope. The table does not diff the live tree against the spec layout.

## Precedence

The catalogue wins on count and on responsibility. The layout wins on directory shape.

## Differences

| # | Kind | Catalogue entry | Layout path | Note |
|---|---|---|---|---|
| 1 | catalogue-only | employer-registry-service | none | The catalogue entry sits at spec:731. The layout names no directory for employer-registry-service. Module 13 task 1 creates `services/employer-registry-service/import/`. |
| 2 | catalogue-only | job-source-worker | none | The catalogue entry sits at spec:732. The layout names no directory for job-source-worker. The plan names no path under `job-source-worker`. The table row at docs/plan/12-jobs-agent.md:40 names `job-source-worker` for the adapters and polling work. Module 13 task 6 carries the `worker` artifact. Module 13 task 7 carries the `connectors/` artifact. Module 13 tasks 8 to 11 carry the `connector` artifact. Module 13 task 13 carries the `connector` artifact. Module 13 task 15 carries the `worker` artifact. Module 13 task 16 carries the `worker` artifact. |
| 3 | catalogue-only | integration-registry | none | The catalogue entry sits at spec:743. The layout names no directory for integration-registry. Module 20 task 11 creates `services/integration-registry/`. |
| 4 | layout-only | none | services/ml-service | The layout path sits at spec:931. Module 06 task 16 wires `workers/inference-worker/` and its `services/ml-service/` API. Module 06 task 21 writes `services/ml-service/resume/`. Module 10 task 12 wires `services/ml-service/`. |
| 5 | layout-only | none | workers/document-worker | The layout path sits at spec:937. Module 06 task 10 provisions `workers/document-worker/`. |
| 6 | renamed | web-app | apps/web | The catalogue entry sits at spec:723. The layout path sits at spec:916. Module 01 task 15 scaffolds `apps/web/`. |
| 7 | renamed | api-gateway-bff | services/api-gateway | The catalogue entry sits at spec:724. The layout path sits at spec:918. Module 01 task 4 builds `services/api-gateway/`. |
| 8 | renamed | channel-adapter-telegram | services/telegram-adapter | The catalogue entry sits at spec:739. The layout path sits at spec:932. Module 14 task 6 builds the `telegram` adapter. The plan names no `services/telegram-adapter/` path. |
| 9 | renamed | channel-adapter-whatsapp | services/whatsapp-adapter | The catalogue entry sits at spec:740. The layout path sits at spec:933. Module 14 task 1 builds `services/whatsapp-adapter/`. |
| 10 | renamed | audit-activity-service | services/audit-service | The catalogue entry sits at spec:742. The layout path sits at spec:934. Module 02 task 5 starts the audit service. Module 02 task 16 builds the audit search. The plan names no `services/audit-service/` path. |

## Deferred cloud

The directory `infra/terraform/aws/` holds only a placeholder. No plan task writes content in it. The spec marks the cloud lab optional at docs/plan/order-and-constraints.md:35. The deferral leaves four spec items at docs/plan/order-and-constraints.md:38. The deferral covers spec:951, spec:831, spec:438 and spec:677. The plan does not defer `infra/k8s/overlays/eks/`. Module 17 task 13 owns `infra/k8s/overlays/`.

## Omitted files

The tree omits 2 files that the spec names. The first is `data/employer-seed-v1.csv` at spec:955, and Module 13 task 3 owns it. The second is `models/model-registry.yaml` at spec:957, and Module 05 task 2 owns it. When the owning task lands, the owning module removes the file from this section and updates the count.

## Extra paths

This task adds 6 path groups beyond the spec layout. The first is docs/layout-diff.md. The second is the two implied parents infra/k8s/overlays/ and infra/terraform/. The third is tests/layout/ with spec_index.py, diff_doc.py, plan_index.py, tree_checks.py, diff_checks.py, copy_checks.py, claims_checks.py, record_claims.py, record_paths.py, ci_checks.py, ci_mutations.py, source_checks.py, repo_checks.py, ignored_paths.py, mutations.py, path_mutations.py, plan_mutations.py, record_mutations.py, cases.py, check_layout.py and test_layout_checks.py. The fourth is the .gitkeep placeholder files that mark the empty directories. The fifth is the repo-root .gitignore, the pyproject.toml and the .github/workflows/ci.yml. The sixth is the services/_template/ service skeleton. The tree holds 61 directories below the root, 47 leaf directories and 43 .gitkeep placeholder files. The allow-list governs directories under nova/ only. A directory passes when it is in the spec layout set, when it lies under a spec-layout directory, or when it matches an allow-list prefix. The allow-list holds tests/layout, labs and db. The checker skips the build output. The always ignored names are __pycache__, node_modules, .next, .turbo, .venv, venv, .pytest_cache, .mypy_cache and .ruff_cache. The ignored output names are build, coverage, dist, htmlcov, playwright-report, storybook-static and test-results. An output name is ignored when it sits directly under a package root. The ignored directory suffixes are .egg-info. The ignored files are .coverage. The ignored temporary files are type_error_proof.py. The ignored file suffixes are .pyc, .pyo and .tsbuildinfo. The always ignored names match at any depth. A source directory with one of these names is skipped by the checks. The owning module gives the directory another name. A skipped path does not change the counts. The checker accepts a file when a plan task names its path. It also accepts a placeholder, a checker module and the record. A module that adds a file under nova/ names the path in its plan row. A module task that adds a path under nova/ or names a new path in its plan row updates this record and nova/tests/layout/tree_checks.py. A module task that creates build output under nova/ adds the output name to nova/tests/layout/ignored_paths.py and to the repo-root .gitignore, and states it in this record. A module task that changes the CI workflow, the tool config or the typecheck scope edits .github/workflows/ci.yml, pyproject.toml and nova/tests/layout/ci_checks.py. A module task that adds a repo-root file names it in this record and in nova/tests/layout/record_paths.py. The record holds the counts, the allow-list, the ignored directories and the plan claims. A module that adds a directory the spec layout does not name adds it to the allow-list in this record and in nova/tests/layout/tree_checks.py. The owning module runs the checks.

## Authoritative copy

The record is nova/docs/layout-diff.md. The checker validates it. Module 01 task 16 writes the copy to `nova/docs/architecture/layout-diff.md`. The copy holds the same 10 rows. The checker compares the kind, the catalogue entry and the layout path of every row. The copy may cite no spec line that the record row does not cite. The checker fails when the copy file holds no layout diff table. The checker reports that no copy exists while the copy file is absent. Any other table under nova/docs/architecture/ that carries the same columns must match the record as well. Module 01 task 16 owns the service map. The plan test for that task requires each of the 23 catalogue services to appear exactly once.
