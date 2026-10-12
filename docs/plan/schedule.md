# Schedule

Realistic solo schedule for NOVA. Start 2026-10-12. Every hour here comes from a module task table. Those tables invent nothing.

## Estimation basis

- One developer. No team.
- Task hours cover build, test and local verification. Each task row has an artifact and a test.
- Contingency: 20 percent added to each phase. Estimates miss. Rework lands here.
- Capacity is the input that moves every date. The default assumption is 30 productive hours per week.
- External gates are waits. They do not consume hours. They can delay a phase end.
- Phase order follows dependency, not the spec's calendar. The design system sits at P5 so every domain page consumes it instead of rebuilding it.

## Phase order rule

A phase may start only when its modules' inputs exist. Three ordering facts matter:

1. The design system at P5 must precede the domain pages at P6 to P9. Otherwise each domain page rebuilds tokens and components.
2. Each curriculum lab runs in the phase that owns its artifact. `19-tech-and-curriculum.md` names that phase for all 12 labs.
3. A module task may name an artifact a later phase builds. When that happens the task targets a stub, a policy object or a local runtime config. It never waits for the later service. Each such row says so in its own words.

## Totals

| Measure | Value |
|---|---|
| Module files | 20 |
| Tasks | 358 |
| Base hours | 1920 |
| Hours with 20 percent contingency | 2309 |
| End date at 30 h/week | 2028-04-07 |
| End date at 40 h/week | 2027-11-24 |
| End date at 20 h/week | 2029-01-02 |

## Conflict with the spec deadline

The spec sets a deadline of 2026-12-31 (spec:697). The full scope needs 1920 hours. Hitting 2026-12-31 from 2026-10-12 means 11.4 weeks, or about 168 hours per week. That is not possible for one person.

The spec anticipates this. Spec:697 says: "Scope management is essential: prove security and one working end-to-end vertical slice first, then add service domains incrementally."

Three options:

1. **Accept 2028-04-07 and build the full scope.** Dates follow hours. Nothing is cut.
2. **Cut to Release 1.** Ship P1 to P4 only. That is 717 base hours: platform, identity, policy, document sandbox, model strategy, agent runtime and scope lock. Release 1 ends 2027-05-02 at 30 h/week. The other 1203 hours cover the design system, domain pages, jobs, channels and hardening, and come after.
3. **Raise capacity.** Each extra 10 h/week pulls the end date forward by about 19 weeks.

The plan default is option 1. Change it by editing the capacity value above and rerunning the date arithmetic.

## Phase schedule at 30 h/week

| Phase | Start | End | Tasks | Hours (with contingency) | Module files |
|---|---|---|---|---|---|
| P1 Repo, contracts, platform | 2026-10-12 | 2026-11-29 | 35 | 208 | 01, 02, 19 |
| P2 Identity and policy | 2026-11-30 | 2027-01-17 | 33 | 208 | 07, 08 |
| P3 Document sandbox and models | 2027-01-18 | 2027-03-06 | 34 | 204 | 06, 05 |
| P4 Agent runtime and scope lock | 2027-03-07 | 2027-05-02 | 37 | 242 | 03, 04 |
| P5 Design system | 2027-05-03 | 2027-06-02 | 18 | 129 | 15 |
| P6 Inbox, calendar, tasks, notes | 2027-06-03 | 2027-07-27 | 37 | 232 | 09, 10 |
| P7 Finance and trips | 2027-07-28 | 2027-08-23 | 17 | 112 | 11 |
| P8 Jobs agent and registry | 2027-08-24 | 2027-11-05 | 45 | 315 | 12, 13 |
| P9 Channels, automations, pages | 2027-11-06 | 2028-01-05 | 40 | 261 | 14, 20 |
| P10 Hardening and testing | 2028-01-06 | 2028-03-13 | 43 | 291 | 17, 16 |
| P11 Release gate | 2028-03-14 | 2028-04-07 | 19 | 107 | 18 |
| **Total** | 2026-10-12 | **2028-04-07** | **358** | **2309** | 20 files |

Check: base hours by phase sum to 1920. Multiply each by 1.2, round up, divide by 30, multiply by 7 and round up to get days.

## Mapping to the spec roadmap

The spec lists 13 milestones (spec:699-711). This plan uses 11 phases because the module boundaries do not cut on milestone dates.

| Spec milestone | Spec window | Plan phase |
|---|---|---|
| Repo, contracts and local platform | Oct 12-18 | P1 |
| Identity and policy service | Oct 19-25 | P2 |
| Document Service | Oct 26-Nov 1 | P3 (module 06) |
| Agent workflow and model gateway | Nov 2-8 | P4 (modules 03, 04), P3 (module 05) |
| Web dashboard, design system and Telegram | Nov 9-15 | P5, P9 (Telegram part) |
| Inbox, calendar, tasks and reminders | Nov 16-22 | P6 |
| Job Agent v1 and employer registry | Nov 23-29 | P8 |
| Finance, notes and trips | Nov 30-Dec 6 | P7, P6 (notes part) |
| WhatsApp Cloud API and automations | Dec 7-13 | P9 |
| Hardening, security and UI completeness | Dec 14-20 | P10 |
| Kubernetes hardening lab | Dec 21-24 | P10 (module 17) |
| Optional cloud deployment | Dec 25-27 | Deferred, see below |
| Release gate | Dec 28-31 | P11 |

Nine milestones have one owning phase. Three rows span two phases: agent workflow (P4 first), dashboard and Telegram (P5 first), and finance with notes (P7 first). The phase named first owns the milestone.

## Deferred: optional cloud deployment

The spec marks the cloud lab optional twice. Spec:438: "cloud EKS is gated by budget and hardening readiness."
Spec:691: "Optional cloud lab: deploy to AWS EKS only after cluster access, IAM, networking, costs and rollback plan are reviewed."

This plan defers it. Kubernetes stays in the stack through `kind`/`k3d` in module 17. No task in this plan provisions AWS. To add the cloud lab later, create a new module. Set a budget cap. Add a Terraform task set. Then rerun this schedule.

## External gates

| Gate | Blocks | Lead time | Fallback |
|---|---|---|---|
| Google OAuth app verification | P6 inbox send scopes, and curriculum lab 6 | Days to weeks, Google review | Use the test-user list while unverified |
| Meta business verification, WABA setup | P9 WhatsApp | Weeks, external review | Ship Telegram only. Mark WhatsApp `blocked-by-claim` |
| Telegram bot token and `setWebhook` | P9 Telegram delivery | Minutes | None |
| Maps or routing API key | P7 trips | Hours | Mark route estimates `manual_only` |
| Plaid or India Account Aggregator terms | P7 finance | Days | CSV and PDF upload only |

## Claims-ledger re-check rule

Re-check runs on **phase day 1**, before task 1. The `Recheck before` date in `claims-ledger.md` is the start date of the earliest phase that uses the row. A row past that date is `stale`, and a `stale` row blocks its dependent phase until a new fetch is recorded.

## Slip trigger

Recompute this schedule when any of these happens:

- A phase ends more than 5 days late.
- You miss a phase's task hours by more than 50 percent.
- A claims-ledger row moves to `stale` and its dependent phase has started.
- Capacity changes by more than 5 hours per week.

Record the recomputation in `changes/`.

## Evaluation metrics

Track these from P4 onward. The spec names ten (spec:715). Do not invent a target before the evaluation set exists.

| Metric | Source | First measured |
|---|---|---|
| Schema validation rejection rate | Contract tests | P1 |
| Extracted material fields with provenance | Document service tests | P3 |
| Ranking quality on a labelled set | Jobs service tests | P8 |
| Duplicate job rate | Registry import checks | P8 |
| Unauthorised tool actions blocked | Red-team suite | P4 |
| Webhook duplicate suppression | Channel adapter tests | P9 |
| Failed or ambiguous action honesty | Fault injection | P4 |
| API p95 and queue backlog | OpenTelemetry | P1 |
| Restore success | Backup drill | P10 |
| Accessibility and responsive issues | Playwright and manual review | P5 |
