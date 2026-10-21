# NOVA build plan

Build plan for `NOVA_Full_Updated_Spec.md`. The spec is the source of truth. This plan adds order and constraints. It never overrides the spec.

## How to use this plan

- Start in `order-and-constraints.md`. It holds the phase order and the binding constraints.
- Then open your phase in the phase table below. It names the module files.
- Each module file holds a build sequence. Each task names an artifact and a test. Order lives at phase level in `order-and-constraints.md`.
- `claims-ledger.md` holds external facts I checked on the web. A stale claim blocks its dependent phase.
- `coverage.md` maps every spec heading to a module file.

## Rules that bind this plan

- The spec wins on every conflict. Report the conflict. Do not silently follow this plan.
- A task counts as complete only when its test passes. A model response is never proof.
- The Artifact column names a category or a shared path, not a unique file. `migrations`, `CI config`, `observability`, `tool registry`, `worker` and `adapter` appear in several modules. A later module extends the shared artifact. It does not rebuild it, unless its own row says so.
- The service polls only a source marked `verified_permitted`. An `unverifiable` claim forces `manual_only`.
- Files stay under 200 lines. Split a module into `-a` and `-b` when it grows.
- Every quoted string attributed to the spec carries a `spec:LINE` reference. Paraphrase carries no quote marks.
- A module task that adds a path under `nova/` or names a new path in its plan row updates `nova/docs/layout-diff.md` and `nova/tests/layout/tree_checks.py`. The record holds the counts, the allow-list and the plan claims. A directory that the spec layout does not name joins the allow-list in both files. A module that adds a file under `nova/` names the path in its plan row. A module task that creates build output under `nova/` adds the output name to `nova/tests/layout/ignored_paths.py` and states it in `nova/docs/layout-diff.md`. The owning module runs the checks.
- A module task that creates `data/employer-seed-v1.csv` or `models/model-registry.yaml` removes the file from the omitted section in `nova/docs/layout-diff.md` and updates the count. The owning module runs the checks.

## Phase table

Phase order follows dependency. The design system lands at P4. The domain pages at P6 to P9 then consume it. They do not rebuild tokens and components.

| Phase | Module files | Tasks | Exit criteria |
|---|---|---|---|
| P1 Repo, contracts, platform | `01-architecture.md`, `02-data-and-audit.md`, `19-tech-and-curriculum.md` | 38 | Gate A. An unauthenticated private service call is rejected. Images run non-root. No secrets in images. |
| P2 Identity and policy | `07-identity-authz.md`, `08-policy-approval.md` | 33 | Replayed, expired and cross-user approvals are denied. RBAC and TLS hold. |
| P3 Document sandbox and models | `06-document-ml-sandbox.md`, `05-model-strategy.md` | 36 | Gate B. The parser returns evidence-bound fields or explicit unknown. Malicious and oversized fixtures fail safely. |
| P4 Design system | `15-design-system.md` | 20 | Action previews, denial states and failure states are keyboard-accessible. Tokens drive both themes. |
| P5 Agent runtime and scope lock | `03-agent-runtime.md`, `04-scope-lock.md` | 37 | Gate C. The model cannot make an unauthorised write. The model cannot fabricate success. |
| P6 Inbox, calendar, tasks, notes | `09-inbox-calendar.md`, `10-tasks-notes.md` | 37 | Gate D. Provider IDs and persisted state verify results. Reminder workers survive restart without duplicates. |
| P7 Finance and trips | `11-finance-trips.md` | 18 | Uncertain extraction is marked for review. Trip estimates are labelled as estimates. |
| P8 Jobs agent and registry | `12-jobs-agent.md`, `13-employer-registry.md` | 46 | Gate E. Job discovery and drafting with safe human handoff. Exactly 250 IN plus 250 GLOBAL seeds. Source verification gates hold. Fresh opening provenance. Claim references stay truthful. No site-rule bypass. |
| P9 Channels, automations, pages | `14-channels.md`, `20-pages-and-automations.md` | 41 | Gate F. Telegram and WhatsApp where setup prerequisites permit. Unsigned and replayed webhooks are rejected and deduplicated. Automations run once per trigger. Every privileged chat action requires a bound approval. |
| P10 Hardening, security and testing | `17-deployment-hardening.md`, `16-reliability-testing.md` | 46 | No known direct model-to-tool path remains. Success and failure states tie to authoritative evidence. Model and parser workloads cannot reach the DB, secrets, the Docker socket, host paths or arbitrary egress. |
| P11 Release gate | `18-release-gate.md` | 20 | Gate G. All ten release invariants pass by test or operator-reviewed record. |
| **Total** | 20 files | **372** | |

The gate column states the exit criteria for the phase. Module 18 verifies and signs gates A to G at P11, from the evidence these phases produced. No earlier phase signs a gate.

## Spec coverage

`coverage.md` lists all 74 spec headings and their module owner. Run the count before you trust it:

```bash
awk 'BEGIN{f=0} /^```/{f=!f;next} f==0 && /^#{1,6} /{print NR": "$0}' NOVA_Full_Updated_Spec.md | wc -l
```

That prints 74. A plain `grep -c '^#'` prints 78. The four extras are bash comments inside a fence.

## Changes

Every change to this plan needs a `changes/` entry and a `repo.md` update. Ask before commit.
