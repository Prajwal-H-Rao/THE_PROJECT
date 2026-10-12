# NOVA build plan

Build plan for `NOVA_Full_Updated_Spec.md`. The spec is the source of truth. This plan adds order, hours and dates. It never overrides the spec.

## How to use this plan

- Start in `schedule.md`. It holds the phase dates and the capacity assumption.
- Then open your phase in the phase table below. It names the module files.
- Each module file holds a build sequence. Each task names an artifact, a test and hours. Dates live at phase level in `schedule.md`.
- `claims-ledger.md` holds external facts I checked on the web. A stale claim blocks its dependent phase.
- `coverage.md` maps every spec heading to a module file.

## Rules that bind this plan

- The spec wins on every conflict. Report the conflict. Do not silently follow this plan.
- A task is done only when its test passes. A model response is never proof.
- Only a source marked `verified` may be polled. An `unverifiable` claim forces `manual_only`.
- Files stay under 200 lines. Split a module into `-a` and `-b` when it grows.
- Every quoted string attributed to the spec carries a `spec:LINE` reference. Paraphrase carries no quote marks.

## Phase table

Dates come from `schedule.md` at the default capacity of 30 hours per week. Change capacity and the dates move.

Phase order follows dependency. The design system lands at P5. The domain pages at P6 to P9 then consume it. They do not rebuild tokens and components.

| Phase | Window | Module files | Tasks | Exit criteria |
|---|---|---|---|---|
| P1 Repo, contracts, platform | 2026-10-12 – 2026-11-29 | `01-architecture.md`, `02-data-and-audit.md`, `19-tech-and-curriculum.md` | 35 | Gate A. An unauthenticated private service call is rejected. Images run non-root. No secrets in images. |
| P2 Identity and policy | 2026-11-30 – 2027-01-17 | `07-identity-authz.md`, `08-policy-approval.md` | 33 | Replayed, expired and cross-user approvals are denied. RBAC and TLS hold. |
| P3 Document sandbox and models | 2027-01-18 – 2027-03-06 | `06-document-ml-sandbox.md`, `05-model-strategy.md` | 34 | Gate B. The parser returns evidence-bound fields or explicit unknown. Malicious and oversized fixtures fail safely. |
| P4 Agent runtime and scope lock | 2027-03-07 – 2027-05-02 | `03-agent-runtime.md`, `04-scope-lock.md` | 37 | Gate C. The model cannot make an unauthorised write. The model cannot fabricate success. |
| P5 Design system | 2027-05-03 – 2027-06-02 | `15-design-system.md` | 18 | Action previews and denial states are keyboard-accessible. Tokens drive both themes. |
| P6 Inbox, calendar, tasks, notes | 2027-06-03 – 2027-07-27 | `09-inbox-calendar.md`, `10-tasks-notes.md` | 37 | Gate D. Provider IDs and persisted state verify results. Reminder workers survive restart without duplicates. |
| P7 Finance and trips | 2027-07-28 – 2027-08-23 | `11-finance-trips.md` | 17 | Uncertain extraction is marked for review. Trip estimates are labelled as estimates. |
| P8 Jobs agent and registry | 2027-08-24 – 2027-11-05 | `12-jobs-agent.md`, `13-employer-registry.md` | 45 | Gate E. Exactly 250 IN plus 250 GLOBAL seeds. Source verification gates hold. Fresh opening provenance. No site-rule bypass. |
| P9 Channels, automations, pages | 2027-11-06 – 2028-01-05 | `14-channels.md`, `20-pages-and-automations.md` | 40 | Gate F. Unsigned and replayed webhooks are rejected and deduplicated. Automations run once per trigger. |
| P10 Hardening, security and testing | 2028-01-06 – 2028-03-13 | `17-deployment-hardening.md`, `16-reliability-testing.md` | 43 | No known direct model-to-tool path remains. Model and parser workloads cannot reach the DB, secrets, the Docker socket, host paths or arbitrary egress. |
| P11 Release gate | 2028-03-14 – 2028-04-07 | `18-release-gate.md` | 19 | Gate G. All ten release invariants pass by test or operator-reviewed record. |
| **Total** | 2026-10-12 – **2028-04-07** | 20 files | **358** | |

## Spec coverage

`coverage.md` lists all 74 spec headings and their module owner. Run the count before you trust it:

```bash
awk 'BEGIN{f=0} /^```/{f=!f;next} f==0 && /^#{1,6} /{print NR": "$0}' NOVA_Full_Updated_Spec.md | wc -l
```

That prints 74. A plain `grep -c '^#'` prints 78. The four extras are bash comments inside a fence.

## Changes

Every change to this plan needs a `changes/` entry and a `repo.md` update. Ask before commit.
