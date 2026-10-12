# 2026-10-12 — NOVA build plan in docs/plan/

## What changed

Added `docs/plan/`. It turns `NOVA_Full_Updated_Spec.md` into an ordered build schedule with hours, dates, acceptance tests and risks.

Three hostile review rounds ran on the first draft. Every round returned blocking defects. This entry records the corrected state after round three.

## Files added

| File | Content |
|---|---|
| `docs/plan/README.md` | Index, binding rules, 11-phase table |
| `docs/plan/schedule.md` | Estimation basis, phase dates, capacity sensitivity, external gates, slip trigger |
| `docs/plan/claims-ledger.md` | 16 web claims with full URLs and phase-start recheck dates, AirLLM rejection |
| `docs/plan/coverage.md` | All 74 spec headings mapped to a module owner, plus unheaded content |
| `docs/plan/01-architecture.md` | 23-service monorepo, gateway, workload identity, network default-deny |
| `docs/plan/02-data-and-audit.md` | Schemas, append-only audit, hash chain, backup |
| `docs/plan/03-agent-runtime.md` | Tool registry, LangGraph workflow, verification |
| `docs/plan/04-scope-lock.md` | 10 enforcement layers, red-team suite from spec:214 |
| `docs/plan/05-model-strategy.md` | Qwen3.5 candidates, 250-case eval gate, lab 11 |
| `docs/plan/06-document-ml-sandbox.md` | Parsers, provenance spans, malware scan, lab 2 |
| `docs/plan/07-identity-authz.md` | OIDC, TOTP, service JWT, RBAC, TLS, 10 matrix rows |
| `docs/plan/08-policy-approval.md` | Policy engine, one-time approval grants |
| `docs/plan/09-inbox-calendar.md` | Mail and calendar adapters behind approval, lab 6 |
| `docs/plan/10-tasks-notes.md` | Tasks, reminder outbox, notes with search and per-item delete |
| `docs/plan/11-finance-trips.md` | Deterministic finance, labelled trip estimates |
| `docs/plan/12-jobs-agent.md` | 11-step flow from spec:518, ranking with evidence, lab 7 |
| `docs/plan/13-employer-registry.md` | 500-row import, spec:559 lifecycle, 4 ATS connectors, lab 12 |
| `docs/plan/14-channels.md` | WhatsApp and Telegram signature checks, lab 5 |
| `docs/plan/15-design-system.md` | 25 tokens, component states, action preview, a11y |
| `docs/plan/16-reliability-testing.md` | Fault injection, telemetry, runbooks, lab 10 |
| `docs/plan/17-deployment-hardening.md` | Docker and Kubernetes isolation, labs 8 and 9 |
| `docs/plan/18-release-gate.md` | 10 invariants from spec:1014, gates A to G with a state file, threat model |
| `docs/plan/19-tech-and-curriculum.md` | Technology table from spec:421, lab map for all 12 labs |
| `docs/plan/20-pages-and-automations.md` | Six missing pages, automation engine, RBAC, Storybook |

All 24 files are under 200 lines. The largest is `schedule.md` at 136.

## Totals

| Measure | Value |
|---|---|
| Module files | 20 |
| Tasks | 358 |
| Base hours | 1920 |
| Hours with 20 percent contingency | 2309 |
| End at 30 h/week | 2028-04-07 |
| End at 40 h/week | 2027-11-24 |
| End at 20 h/week | 2029-01-02 |
| Release 1 (P1-P4, 717 h) at 30 h/week | 2027-05-02 |

## Corrected defects

Round one blocked on 19 issues. Round two blocked on 9. Round three blocked on 12 and 13 from the two independent reviewers. The first three defects were the same in rounds one and two.

Rounds one and two covered arithmetic, provenance and missing content. Round three found dependency order: tasks that named artifacts a later phase had not built yet.

1. The schedule claimed 174 tasks and 750 hours. The module tables held far more. Every phase date rested on a number no module supported. The schedule now sums from the module tables.
2. Twelve module files stated a total that did not equal their own task rows. All 20 totals now match. A script check confirms this.
3. The README said each task carries dates. No module held a date. Dates live at phase level only.
4. About 36 strings were quoted as spec text but did not exist in the spec. Each constraint block now names the spec line numbers of its verbatim strings. Paraphrase carries no quote marks.
5. `15-design-system` listed tokens the spec does not define. It now lists the 25 keys from spec:251-275 plus radii and shadows from spec:282-311. Spacing base corrected from 8px to 4px.
6. `13-employer-registry` listed CSV columns that do not exist. It now uses the real 11-column header. The invented state machine is replaced by the full spec:559 lifecycle.
7. `12-jobs-agent` invented a flow, invented application states and cited criteria not in the spec. It now follows spec:518-528 and spec:545-551.
8. `01-architecture` said 21 services, then 23, then the spec layout block showed 18 directories. The catalogue at spec:723-745 now wins, and the task records the three additions.
9. `19-tech-and-curriculum` chose FastAPI, MCP and Vite. The spec requires Flask, has no MCP and mandates Next.js. Labs now follow spec:682-693.
10. `17-deployment-hardening` quoted a sentence the spec does not contain and downgraded Kubernetes. It now quotes spec:23.
11. Modules 05, 12 and 13 had no acceptance tests. All three now have them.
12. Six tests could not fail, such as "Decision has evidence". Each now asserts a concrete observable condition.
13. Missing content had no owner: the Assistant, Today, Automations, Integrations, Activity and Settings pages, RBAC, TLS, Storybook, the malware scan, the quoted-tool-output red-team case and the seed-list maintenance rules. Module 20 and edits to 06, 07, 04 and 13 cover them.
14. The claims ledger used an undefined `waived` status and held non-recheckable sources. The status is removed. Every source is a full URL.
15. Recheck dates fell on phase end dates, so a check could run after the work. Dates are now phase start dates, and the check runs on phase day 1.
16. An external gate named an AWS cloud lab with no task behind it. The spec marks that lab optional at spec:438 and spec:691. It is now deferred with the reason recorded.
17. The design system sat at P8, after the domain pages that consume it. It moved to P5. Phase order now follows dependency.
18. All 12 curriculum labs sat in P1, but six need artifacts later phases own. Ten labs moved into the phase that owns their artifact. Module 19 keeps labs 1 and 3 and publishes the map for the rest.
19. The threat-model review required by spec:711 had no owner or task. It is now task 18 of module 18.
20. The Security test layer dropped XSS, path traversal and webhook replay from spec:866. All are restored.
21. ASD-STE100 fixes: three goal sentences were passive or verb-less, and nine heading lines ran past 20 words. All are rewritten.

Round three defects:

22. Twelve tasks named artifacts that a later phase had not built yet. Parser tests sat in P1, gateway tests in P3, and channel-adapter artifacts in P2 and P4. Each task now targets a stub, a policy object or a local runtime config, and says so.
23. All 12 curriculum labs sat in P1, but ten need artifacts a later phase owns. Labs 2 and 3 moved to the phase that owns their artifact. Module 19 now owns lab 1 only and publishes the map for the other 11.
24. No task built the Next.js app, yet a P1 test asserted it. Module 01 gained a scaffold task. The `test_frontend_is_nextjs` assertion moved with it.
25. Module 18 carried two identical threat-model rows. One was removed.
26. Six artifacts were owned by two modules: `families.yaml`, the fake model, RBAC roles, the admin plane, the channel nonce and the inbox tool family. Each is now created once and consumed afterwards.
27. Eleven spec requirements had no task: the seed CSV, `integration-registry`, `docs/architecture`, saved filters and digests, failure copy that names a stage, the PII exfiltration case, the three-pane Inbox page, Telegram bot creation with `setWebhook`, the spec:845 runbooks and the compromised-pod drill, the final demo, and the Automations page.
28. Five acceptance tests could not fail or could not be observed: the contrast scan, the lab registry, the runbook command set, the robots review and "no critical issues". Each now asserts a recorded artifact.
29. Ten "Build sequence for this week" lists held more than 30 hours. The section is renamed to "Build order". It now states that a phase spans several weeks.
30. `01-architecture` counted 22 covered catalogue entries where 20 were covered, and it missed the two layout-only entries `ml-service` and `document-worker`. The diff is now 20 shared, 3 catalogue-only, 2 layout-only and 4 renames.
31. Claim C06 named two dependent phases but carried one recheck date. It split into C06 and C06b so each row carries the start of its own phase.
32. The roadmap table said every milestone had one owning phase. Three rows span two phases now, and the deferred cloud row is named.
33. Every quoted constraint bullet in modules 01 to 08 carried no `spec:LINE` ref. All 32 now carry one. One quote in module 03 read "verifies the outcome" where the spec says "verifies the operation did not happen". The quote now matches the spec.
34. ASD-STE100: the verb-less `Total: NN hours.` fragment appeared 20 times. Every one became a sentence. Seven long sentences and 25 passive constructions in narrative prose were rewritten. Verbatim spec quotes stay intact, because they must remain exact.

## Key decisions

- Capacity basis: one developer, 30 hours per week, 20 percent contingency.
- Computed end date: 2028-04-07. The spec deadline of 2026-12-31 needs about 168 hours per week for one person. Three options are recorded in `schedule.md`, including a Release 1 cut at 717 hours ending 2027-05-02.
- AirLLM is rejected. NOVA's models fit in 4 GB VRAM. AirLLM costs seconds per token and is not an OpenAI-compatible server. Ledger rows C15 and C16 record the rejection with a 2028-03-22 recheck.
- No ledger row decides the default model. Only the 250-case evaluation gate does, per spec:510.

## Other changes

- `repo.md`: disclosed a second purpose. Added Layout entries for the spec, the CSV, `docs/plan/` and `README.md`.

## Verification

- 24 files exist under `docs/plan/`. None exceeds 190 lines.
- A script sums every module build-sequence row and compares it to the stated total. All 20 match.
- A second script confirms the phase sums in `schedule.md` and `README.md` equal the module sums: 1920 base hours, 2309 buffered hours, 358 tasks.
- A third script extracts all 113 quoted strings over 18 characters and searches the spec for each. Every quote resolves to real spec text. The 29 apparent misses were bold markers, ellipses, trailing periods and curly quotes.
- A fourth script confirms every quoted constraint bullet in modules 01 to 08 carries a `spec:LINE` ref. Zero unattributed bullets remain.
- A fifth script confirms every `spec:LINE` ref falls inside 1 to 1542.
- `coverage.md` lists 74 heading rows, matching the fence-aware count.
- The fence-aware heading command in `README.md` prints 74. `grep -c '^#'` prints 78.
- Every module reference inside `docs/plan/` resolves to a file that exists. All 20 modules are referenced.
