# NOVA plan status

Reconciled status of the NOVA build plan. Date: 2026-11-06. Owner: the implementing model updates this file after each task.

## Method

No single tracker existed. This file reconciles four sources:

1. The build sequence tables in `docs/plan/01-*.md` to `21-*.md`.
2. The status line in `repo.md`.
3. The entries in `changes/`.
4. The tree under `nova/` and the test files.

`Done` means code exists, plus a changelog entry or a test. `Partial` means code exists but proof is missing. `Open` means no code.

A model response is never proof. A task is done only when its test passes.

## Phase summary

| Phase | Modules | Tasks | Done | Partial | Open | Complete |
|---|---|---|---|---|---|---|
| P1 Repo, contracts, platform | 01, 02, 19 | 39 | 38 | 0 | 1 | 97% |
| P2 Identity and policy | 07, 08 | 33 | 33 | 0 | 0 | 100% |
| P3 Document sandbox and models | 06, 05 | 37 | 37 | 0 | 0 | 100% |
| P4 Design system | 15 | 21 | 21 | 0 | 0 | 100% |
| P5 Agent runtime and scope lock | 21, 03, 04 | 54 | 52 | 0 | 0 | 100% |
| P6 Inbox, calendar, tasks, notes | 09, 10 | 48 | 39 | 0 | 9 | 81% |
| P7 Finance and trips | 11 | 18 | 2 | 2 | 14 | 11% |
| P8 Jobs agent and registry | 12, 13 | 46 | 7 | 0 | 39 | 15% |
| P9 Channels, automations, pages | 14, 20 | 41 | 0 | 0 | 41 | 0% |
| P10 Hardening, security, testing | 17, 16 | 46 | 4 | 13 | 29 | 9% |
| P11 Release gate | 18 | 20 | 0 | 0 | 20 | 0% |
| **Total** | **21 files** | **403** | **235** | **16** | **153** | **58%** |

## Module detail

| Module | Done | Partial | Open | State | Notes |
|---|---|---|---|---|---|
| 01 Architecture | 17 | 0 | 0 | Complete | `docs/architecture/` exists (task 16). |
| 02 Data and audit | 16 | 0 | 1 | Nearly done | Export and delete workflow (task 13) has only migration 11. |
| 19 Tech and curriculum | 5 | 0 | 0 | Complete | Lab registry and `THIRD_PARTY.md` exist. |
| 07 Identity and authz | 18 | 0 | 0 | Complete | OIDC, TOTP, RBAC, migrations 14 to 23. |
| 08 Policy and approval | 15 | 0 | 0 | Complete | Grants, bulk decisions, metrics, audit, versioning. |
| 05 Model strategy | 16 | 0 | 0 | Complete | Registry at `nova/models/model-registry.yaml`, eval set, lab 11. |
| 06 Document sandbox | 21 | 0 | 0 | Complete | OCR, isolation proof, fixture corpus, citation validator, malware scan, NLP resume. |
| 15 Design system | 21 | 0 | 0 | Complete | Playwright harness written and both e2e flows pass against the local stack (spec:873). Approval outcomes keyboard-reachable (task 13 done). |
| 21 MCP surface | 15 | 0 | 0 | Complete | Bounded fetch, browser worker, service MCP servers, lab 13. |
| 03 Agent runtime | 19 | 0 | 0 | Complete | Cancellation (task 16) implemented — worker checks cancellation_requested at each node. |
| 04 Scope lock | 19 | 0 | 1 | Nearly done | CI re-run trigger (task 17) is not in `ci.yml`. |
| 09 Inbox and calendar | 9 | 0 | 9 | Partial | Inbox 1 to 7, 9, 10 done. Draft preview and calendar tasks open. |
| 10 Tasks and notes | 30 | 0 | 0 | Complete | All task IDs done. The file holds 32 rows; two rows repeat a number. |
| 11 Finance and trips | 2 | 2 | 14 | Started | Transaction table and trip table only. |
| 12 Jobs agent | 0 | 0 | 21 | Not started | `jobs-service` holds an unrelated generic job scaffold. |
| 13 Employer registry | 7 | 0 | 18 | Started | Tasks 1 to 7 done. Connectors, scheduling, freshness, UI open. |
| 14 Channels | 0 | 0 | 20 | Not started | Telegram and WhatsApp hold `.gitkeep` only. |
| 20 Pages and automations | 0 | 0 | 21 | Not started | Only the Tasks page exists. |
| 17 Deployment hardening | 3 | 4 | 19 | Started | Network, loopback and limits done. K8s, egress, base image, registry empty. |
| 16 Reliability and testing | 1 | 9 | 10 | Started | Restore drill exists. Faults, perf, a11y CI, runbooks, lab 10 absent. |
| 18 Release gate | 0 | 0 | 20 | Not started | `docs/release/` and `docs/runbooks/` are absent. |

## Source conflicts

1. `docs/plan/README.md` states 390 tasks. The module tables hold 406 rows and 403 unique task IDs. Modules 08 and 10 repeat task numbers.
2. `repo.md` states "Module 12-21 complete". The tree does not support this claim.
3. `repo.md` calls the model-strategy work "Module 11". That work belongs to module 05.
4. `repo.md` calls modules 06, 08 and 21 complete. Modules 06 and 21 hold open tasks.
5. `README.md` and `docs/handover-services.md` list inbox, tasks, notification, jobs and finance as "planned". They hold code.
6. Only modules 03, 04 and 05 carry inline `DONE` marks. Those marks are not a tracker.

## Security flag

Resolved on 2026-11-06: `nova/services/shell-service/` (which ran `child_process.exec` on a free-form string) was deleted. No shell/process-execution path remains. The spec deny-list at `NOVA_Full_Updated_Spec.md:212` is now satisfied by the tree.

## Refresh

Run these commands after each task:

```bash
python nova/tests/layout/check_layout.py
python nova/tests/layout/test_layout_checks.py
ruff check .
mypy nova
```

Then update the Done, Partial and Open counts for the module. Then update the phase row. Then update the total row.

## Related files

- `docs/plan/execution-plan.md` — task loop, commands and rules.
- `docs/plan/execution-phases.md` — phase gates and work packages.
- `docs/plan/worklist.md` — live list of open and partial tasks for P1 to P6.
- `docs/plan/worklist-p7-p11.md` — live list of open and partial tasks for P7 to P11.
