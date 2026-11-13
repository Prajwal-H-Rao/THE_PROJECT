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
| P5 Agent runtime and scope lock | 21, 03, 04 | 54 | 52 | 1 | 1 | 96% |
| P6 Inbox, calendar, tasks, notes | 09, 10 | 48 | 48 | 0 | 0 | 100% |
| P7 Finance and trips | 11 | 18 | 18 | 0 | 0 | 100% |
| P8 Jobs agent and registry | 12, 13 | 46 | 35 | 0 | 11 | 76% |
| P9 Channels, automations, pages | 14, 20 | 41 | 0 | 0 | 41 | 0% |
| P10 Hardening, security, testing | 17, 16 | 46 | 4 | 13 | 29 | 9% |
| P11 Release gate | 18 | 20 | 0 | 0 | 20 | 0% |
| **Total** | **21 files** | **403** | **287** | **15** | **101** | **71%** |

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
| 03 Agent runtime | 18 | 1 | 0 | Nearly done | Cancellation (task 16) implemented and ticked, but stays partial: only py_compile ran because langgraph is not installable here. |
| 04 Scope lock | 19 | 0 | 1 | Nearly done | CI re-run trigger (task 17) is not in `ci.yml`. |
| 09 Inbox and calendar | 18 | 0 | 0 | Complete | Inbox rows 1 to 7, 9, 10 done. Draft preview done. Calendar page done with tests. Calendar adapter, attendee-aware approval, conflict detection, ICS import and export, provider failure paths done. Lab 6 delivered against the real service code; acceptance 'send without a grant fails' passes. Three-pane Inbox page done against spec:407. Module 09 complete. |
| 10 Tasks and notes | 30 | 0 | 0 | Complete | All task IDs done. The file holds 32 rows; two rows repeat a number. |
| 11 Finance and trips | 18 | 0 | 0 | Complete | Transaction table and trip table only. CSV and OFX import done with locale variants (task 11.2). PDF statement parsing done through the document service; rows keep row and column refs (task 11.3). Content-addressed deduplication across imports done; re-import is a no-op (task 11.4). Deterministic currency conversion with a dated rate table done; rounding cases pass (task 11.5). Rule-based categoriser with override history done; rules are deterministic (task 11.6). Model-drafted category with confidence and reason done; low confidence forces review (task 11.7). Ambiguous-import review queue done; queue surfaces only uncertain rows (task 11.8). Totals, budgets and trends computed in code; rounding cases pass (task 11.9). Export and delete for the finance domain done; delete removes objects (task 11.10). Provider connection handling and account-linking consent done; consent scope is explicit (task 11.11). Plaid or India Account Aggregator behind config flag; flag off means CSV only (task 11.12). Route and fare estimation with a provider adapter done; estimates are labelled (task 11.14). Itinerary draft, packing list and pre-departure checklist done; day math is civil calendar arithmetic in the trip timezone, DST-safe, and every draft day carries an estimate label (task 11.15). Booking gated behind an approval grant: trips.book added to the MCP catalogue at tier3 (grant required) and to the trips policy family at tier3/needs_approval; deterministic bookTrip() records the booking intent without moving money (task 11.16). Finance and Trips page: period selector, net and cash-flow cards, category chart, import provenance table, review queue for uncertain rows, trips section with SVG map, stops, route timeline, transport options, booking links carrying estimate labels; all finance totals computed deterministically in integer minor units; no money movement (task 11.17). Trips operations registered with the policy layer: operation-registry validates argument schemas for trips.read, trips.write, trips.compare, trips.book; unregistered arguments are denied with ruleId "unregistered_argument" (task 11.18). |
| 12 Jobs agent | 18 | 0 | 3 | Started | Tasks 12.1 to 12.7 done; tasks 12.9 to 12.18 and 12.20 done: span mapping, drafting, checklist, envelope, submission gate, submission adapter, confirmation, follow-up states, handoff, duplicate detection, export/deletion. `ranking_quality.json` carries measured precision@50. UI tasks 12.8, 12.19 deferred (frontend needed); lab 12.21 deferred (labs/lab02/ exists as Python lab). |
| 13 Employer registry | 17 | 0 | 8 | Started | Tasks 1 to 7 done (CSV importer, validate, ats-resolver, lifecycle, poll-gate, alias). Tasks 13.8 to 13.17 done: four ATS adapters (Greenhouse, Lever, Ashby, SmartRecruiters), lab 7, permitted-public-page extractor, migration 41 (employer_targets + employer_job_sources + job_source_run extensions), backoff/breaker/rate limits, scheduled poll with guardPoll. Tests use fixtures only (no live network). |
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
