# Schedule

This schedule is realistic for one developer on NOVA. Start 2026-10-12. Every hour here comes from a module task table. Those tables invent nothing.

## Estimation basis

- One developer. No team.
- Task hours cover build, test and local verification. Each task row has an artifact and a test.
- Contingency: 20 percent added to each phase. Estimates miss. Rework lands here.
- Capacity is the input that moves every date. The default assumption is 40 productive hours per week.
- External gates are waits. They do not consume hours. They can delay a phase end.
- Phase order follows dependency, not the spec's calendar. The design system sits at P4 so every domain page consumes it instead of rebuilding it.

## Phase order rule

A phase may start only when its modules' inputs exist. Nine ordering rules apply:

1. The design system at P4 must precede the domain pages at P6 to P9. Otherwise each domain page rebuilds tokens and components.
2. Each curriculum lab runs in the phase that owns its artifact. `19-tech-and-curriculum.md` names that phase for all 12 labs.
3. A module task may name an artifact a later phase builds. When that happens the task targets a stub, a policy object or a local runtime config. It never waits for the later service. Each such row says so in its own words.
4. Two modules in one phase may interleave when each owns half of one workflow. `12-jobs-agent` and `13-employer-registry` do. Neither module waits for the other to finish. Work them in this order:
  - `12` tasks 1 to 7, the jobs service.
  - `13` tasks 1 to 17, the registry service.
  - `12` tasks 8 to 21, job discovery and drafting.
  - `13` tasks 18 to 25, opening tracking and filters.
5. In P2, `08-policy-approval` runs tasks 1-3 first. Then `07-identity-authz` runs in order. Then `08-policy-approval` runs from task 4.
6. In P5, `03-agent-runtime` runs tasks 1-16 first. Then `04-scope-lock` runs in order. Then `03-agent-runtime` runs from task 17. `04-scope-lock` consumes the orchestrator and the verifier that `03-agent-runtime` builds.
7. Task-table cells hold one instruction of 20 words or fewer. The ten release invariants in `18-release-gate.md` stay at full length. They are normative criteria, not build instructions.
8. In P10, `16-reliability-testing` runs the parser pod drill only after `17-deployment-hardening` builds the `kind` cluster at tasks 11-21.
9. In P4, `15-design-system` runs task 17 first. The component crawl and task 14's screenshot tests need the Playwright harness.

## Totals

| Measure | Value |
|---|---|
| Module files | 20 |
| Tasks | 372 |
| Base hours | 2000 |
| Agent-adjusted hours | 1271 |
| Hours with 20 percent contingency | 1529 |
| Weekly capacity assumed | 40 h |
| End date at 40 h/week | 2027-07-10 |
| End date at 30 h/week | 2027-10-08 |
| End date at 50 h/week | 2027-05-19 |
| Release 1 (P1 to P4) | 2027-01-01 |

## Agent leverage assumption

Base hours are the work an unaided developer does. AI agents cut authoring time. They do not cut verification, integration, security judgment or third-party waits.

The plan applies one retained-hour factor per phase, then contingency, then divides by weekly capacity.

| Phase | Retained | Why |
|---|---|---|
| P1 | 0.55 | Scaffolding and contracts are templated. Architecture decisions stay human. |
| P2 | 0.60 | Auth boilerplate is well documented. Policy correctness needs human review. |
| P3 | 0.70 | Parsing and sandboxing need real-hardware measurement. |
| P4 | 0.40 | Agents generate token sets and components from templates very efficiently. This is the most aggressive factor in the plan. The 22 h of Playwright, accessibility and screen-reader checks sit wholly inside P4, and they do not compress. The factor therefore overstates the saving. Under that factor the window leaves about 3 h of slack across Christmas and New Year. Raise it to 0.50 and Release 1 moves to 2027-01-04. |
| P5 | 0.75 | Safety-critical runtime work. Red-team judgment stays human. |
| P6 | 0.50 | CRUD and pages over an existing design system. |
| P7 | 0.50 | Same shape as P6. |
| P8 | 0.65 | The 200-case ranking set and the 250 + 250 seed check need your own labels. |
| P9 | 0.65 | Webhook correctness and provider quirks need hand testing. |
| P10 | 0.75 | Security review and verification stay human. |
| P11 | 0.80 | Operator-reviewed records are human work. |

## The spec deadline

The spec sets 2026-12-31 (spec:697). The full scope needs 2000 base hours. Hitting that date for all 11 phases needs about 175 hours per week unaided. That still does not compress the external gates.

Spec:697 says: "Scope management is essential: prove security and one working end-to-end vertical slice first, then add service domains incrementally."

The plan follows that instruction. Release 1 is P1 to P4: platform, identity, policy, document sandbox and models, and the design system. Release 1 lands 2027-01-01. Rounding each phase up to whole days costs one day past the spec deadline. The other phases run through 2027.

Two facts limit what agents can compress:

- Gmail production access, WhatsApp Business verification, Apple and Google review, and DNS are third-party calendars. Parallel work does not shorten them.
- The 250-case evaluation gate (spec:510) needs your own label judgment. An agent cannot sign it off.

## Phase schedule at 40 h/week

| Phase | Start | End | Tasks | Base h | Agent h | Buffered h | Modules |
|---|---|---|---|---|---|---|---|
| P1 Repo, contracts, platform | 2026-10-12 | 2026-11-02 | 38 | 189 | 104 | 125 | 01, 02, 19 |
| P2 Identity and policy | 2026-11-03 | 2026-11-24 | 33 | 173 | 104 | 125 | 07, 08 |
| P3 Document sandbox and models | 2026-11-25 | 2026-12-21 | 36 | 180 | 126 | 152 | 06, 05 |
| P4 Design system | 2026-12-22 | 2027-01-01 | 20 | 123 | 50 | 60 | 15 |
| P5 Agent runtime and scope lock | 2027-01-02 | 2027-02-02 | 37 | 201 | 151 | 182 | 03, 04 |
| P6 Inbox, calendar, tasks, notes | 2027-02-03 | 2027-02-23 | 37 | 194 | 97 | 117 | 09, 10 |
| P7 Finance and trips | 2027-02-24 | 2027-03-06 | 18 | 98 | 49 | 59 | 11 |
| P8 Jobs agent and registry | 2027-03-07 | 2027-04-12 | 46 | 267 | 174 | 209 | 12, 13 |
| P9 Channels, automations, pages | 2027-04-13 | 2027-05-13 | 41 | 222 | 145 | 174 | 14, 20 |
| P10 Hardening, security and testing | 2027-05-14 | 2027-06-23 | 46 | 259 | 195 | 234 | 17, 16 |
| P11 Release gate | 2027-06-24 | 2027-07-10 | 20 | 94 | 76 | 92 | 18 |
| **Total** | 2026-10-12 | **2027-07-10** | **372** | **2000** | **1271** | **1529** | 20 files |

Check: base hours sum to 2000. Per phase, take base x the agent factor, round up, then x 1.2, round up. Divide by 40, multiply by 7, round up to get days.

## Mapping to the spec roadmap

The spec lists 13 milestones (spec:699-711). This plan uses 11 phases because the module boundaries do not cut on milestone dates.

| Spec milestone | Spec window | Plan phase |
|---|---|---|
| Repo, contracts and local platform | Oct 12-18 | P1 |
| Identity and policy service | Oct 19-25 | P2 |
| Document Service | Oct 26-Nov 1 | P3 (module 06) |
| Agent workflow and model gateway | Nov 2-8 | P5 (modules 03, 04), P3 (module 05), P2 (module 08 approvals) |
| Web dashboard, design system and Telegram | Nov 9-15 | P9 (Today, Assistant and Telegram), P4 (design system) |
| Inbox, calendar, tasks and reminders | Nov 16-22 | P6 |
| Job Agent v1 and employer registry | Nov 23-29 | P8 |
| Finance, notes and trips | Nov 30-Dec 6 | P7, P6 (notes part) |
| WhatsApp Cloud API and automations | Dec 7-13 | P9 |
| Hardening, security and UI completeness | Dec 14-20 | P10 |
| Kubernetes hardening lab | Dec 21-24 | P10 (module 17) |
| Optional cloud deployment | Dec 25-27 | Deferred, see below |
| Release gate | Dec 28-31 | P11 |

Nine milestones have one owning phase. Two span two phases: dashboard and Telegram (P9 first), and finance with notes (P7 first). One spans three phases: agent workflow (P5 first). One milestone stays deferred. The phase named first owns the milestone.

## Deferred: optional cloud deployment

The spec marks the cloud lab optional twice. Spec:438: "cloud EKS is gated by budget and hardening readiness."
Spec:691: "Optional cloud lab: deploy to AWS EKS only after cluster access, IAM, networking, costs and rollback plan are reviewed."

This plan defers it. Kubernetes stays in the stack through `kind`/`k3d` in module 17. No task in this plan provisions AWS. The deferral leaves four spec items with no owning task. Spec:951 names an `infra/terraform/aws/` tree. Spec:831 names AWS ECS or Fargate tasks, task IAM roles, private subnets and no long-lived keys. Spec:438 names the EKS cluster itself. Spec:677 sets a curriculum definition of done for cloud work. It requires all of the following:
- No long-lived cloud keys in pods.
- Least-privilege IAM.
- Private endpoints where feasible.
- A tested restore and rollback runbook.
- A tested budget alert.

Nothing in this plan builds any of those four items. To add the cloud lab later, create a new module for them. Set a budget cap. Then rerun this schedule.

## External gates

| Gate | Blocks | Lead time | Fallback |
|---|---|---|---|
| Google OAuth app verification | P2 identity login scopes (module 07), P6 inbox send scopes, and curriculum lab 6 | Days to weeks, Google review | Use the test-user list while unverified |
| Meta business verification, WABA setup | P9 WhatsApp | Weeks, external review | Ship Telegram only. Mark WhatsApp `blocked-by-claim` |
| Telegram bot token and `setWebhook` | P9 Telegram delivery | Minutes | None |
| Maps or routing API key | P7 trips | Hours | Mark route estimates `manual_only` |
| Plaid or India Account Aggregator terms | P7 finance | Days | CSV and PDF upload only |

## Claims-ledger re-check rule

Re-check runs on **phase day 1**, before task 1. The `Recheck before` date in `claims-ledger.md` is the start date of the earliest phase that uses the row. A row past that date is `stale`. A `stale` row blocks its dependent phase until the developer records a new fetch.

## Slip trigger

Recompute this schedule when any of these happens:

- A phase ends more than 5 days late.
- You miss a phase's task hours by more than 50 percent.
- A claims-ledger row moves to `stale` and its dependent phase has started.
- Capacity changes by more than 5 hours per week.

Record the recomputation in `changes/`.

## Evaluation metrics

Some of these are measurable from P1. The agent-specific ones need the evaluation set, which starts in P5. The spec names ten (spec:715). Do not invent a target before the evaluation set exists.

| Metric | Source | First measured |
|---|---|---|
| Schema validation rejection rate | Contract tests | P1 |
| Extracted material fields with provenance | Document service tests | P3 |
| Ranking quality on a labelled set | Jobs service tests | P8 |
| Duplicate job rate | Registry import checks | P8 |
| Unauthorised tool actions blocked | Red-team suite | P5 |
| Webhook duplicate suppression | Channel adapter tests | P9 |
| Failed or ambiguous action honesty | Fault injection | P10 |
| API p95 and queue backlog | OpenTelemetry | P1 |
| Restore success | Backup drill | P10 |
| Accessibility and responsive issues | Playwright and manual review | P4 |
