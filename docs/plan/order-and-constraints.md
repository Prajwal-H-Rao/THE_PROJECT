# Order and constraints

Order and constraints for `NOVA_Full_Updated_Spec.md`. The spec is the source of truth. This file holds the phase order and the binding constraints. It never overrides the spec.

## Phase order rules

A phase may start only when its modules' inputs exist. Nine ordering rules apply:

1. The design system at P4 must precede the domain pages at P6 to P9. Otherwise each domain page rebuilds tokens and components.
2. Each curriculum lab runs in the phase that owns its artifact. `19-tech-and-curriculum.md` names that phase for all 13 labs.
3. A module task may name an artifact a later phase builds. When that happens the task targets a stub, a policy object or a local runtime config. It never waits for the later service. Each such row says so in its own words.
4. Two modules in one phase may interleave when each owns half of one workflow. `12-jobs-agent` and `13-employer-registry` do. Neither module waits for the other to finish. Work them in this order:
   - `12` tasks 1 to 7, the jobs service.
   - `13` tasks 1 to 17, the registry service.
   - `12` tasks 8 to 21, job discovery and drafting.
   - `13` tasks 18 to 25, opening tracking and filters.
5. In P2, `08-policy-approval` runs tasks 1-3 first. Then `07-identity-authz` runs in order. Then `08-policy-approval` runs from task 4.
6. In P5, `21-mcp-surface` runs first. Then `03-agent-runtime` runs tasks 1-16. Then `04-scope-lock` runs in order. Then `03-agent-runtime` runs from task 17. `04-scope-lock` consumes the orchestrator and the verifier that `03-agent-runtime` builds, and the MCP client that `21-mcp-surface` builds.
7. Task-table cells hold one instruction of 20 words or fewer. The ten release invariants in `18-release-gate.md` stay at full length. They are normative criteria, not build instructions.
8. In P10, `16-reliability-testing` runs the parser pod drill only after `17-deployment-hardening` builds the `kind` cluster at tasks 11-21.
9. In P4, `15-design-system` runs task 17 first. The component crawl and task 14's screenshot tests need the Playwright harness.

## External gates

| Gate | Blocks | Lead time | Fallback |
|---|---|---|---|
| Google OAuth app verification | P2 identity login scopes (module 07), P6 inbox send scopes, and curriculum lab 6 | Days to weeks, Google review | Use the test-user list while unverified |
| Meta business verification, WABA setup | P9 WhatsApp | Weeks, external review | Ship Telegram only. Mark WhatsApp `blocked-by-claim` |
| Telegram bot token and `setWebhook` | P9 Telegram delivery | Minutes | None |
| Maps or routing API key | P7 trips | Hours | Mark route estimates `manual_only` |
| Plaid or India Account Aggregator terms | P7 finance | Days | CSV and PDF upload only |

## Deferred: optional cloud deployment

The spec marks the cloud lab optional twice. Spec:441: "cloud EKS is gated by budget and hardening readiness."
Spec:694: "Optional cloud lab: deploy to AWS EKS only after cluster access, IAM, networking, costs and rollback plan are reviewed."

This plan defers it. Kubernetes stays in the stack through `kind`/`k3d` in module 17. No task in this plan provisions AWS. The deferral leaves four spec items with no owning task. Spec:955 names an `infra/terraform/aws/` tree. Spec:835 names AWS ECS or Fargate tasks, task IAM roles, private subnets and no long-lived keys. Spec:441 names the EKS cluster itself. Spec:680 sets a curriculum definition of done for cloud work. It requires all of the following:

- No long-lived cloud keys in pods.
- Least-privilege IAM.
- Private endpoints where feasible.
- A tested restore and rollback runbook.
- A tested budget alert.

Nothing in this plan builds any of those four items. To add the cloud lab later, create a new module for them. Set a budget cap. Then rerun this plan.

## Claims-ledger re-check rule

Re-check a ledger row before the dependent module's first task. `claims-ledger.md` holds the `Recheck before` date for each row. A `stale` row blocks its dependent phase until the developer records a new fetch.

## Evaluation metrics

Some of these are measurable from P1. The agent-specific ones need the evaluation set, which starts in P5. The spec names ten (spec:719). Do not invent a target before the evaluation set exists.

| Metric | Source | Owner phase |
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
