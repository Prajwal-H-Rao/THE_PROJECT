# 2026-10-12 — NOVA build plan in docs/plan/

## What changed

Read `NOVA_Full_Updated_Spec.md` in full, 1542 lines. Verified its external claims on the
web. Wrote a build plan as 24 markdown files in `docs/plan/`. The plan turns the spec into
an ordered build schedule for one developer using AI agents.

## Result

| Measure | Value |
|---|---|
| Plan files | 24 |
| Modules | 20 |
| Tasks | 372 |
| Base hours | 2000 |
| Agent hours | 1271 |
| Buffered hours | 1529 |
| Phases | 11 |
| Start | 2026-10-12 |
| End at 40 h/week | 2027-07-10 |
| End at 30 h/week | 2027-10-08 |
| End at 50 h/week | 2027-05-19 |
| Release 1 (P1 to P4) | 665 base hours, ends 2027-01-01 |
| Scope after Release 1 | 1335 base hours |

The spec dates the work 2026-10-12 to 2026-12-31. Hitting that date needs about 175 hours
per week for eleven weeks. The plan reports a realistic figure instead.

## How the hours are counted

Each phase has a base-hour total and an agent-retained factor. Base hours are the work an
unaided developer does. AI agents cut authoring time. They do not cut verification,
integration or third-party waits.

The chain is: base hours, times the phase factor, rounded up, times 1.2 for contingency,
rounded up, divided by 40 hours per week. Phase days come from that figure.

| Phase | Factor | Why |
|---|---|---|
| P1 | 0.55 | Platform, contracts and CI are well documented. |
| P2 | 0.60 | Auth boilerplate is documented. Policy correctness needs human review. |
| P3 | 0.70 | Parsing and sandboxing need real-hardware measurement. |
| P4 | 0.40 | Agents generate token sets and components efficiently. |
| P5 | 0.75 | Safety-critical runtime work. Red-team judgment stays human. |
| P6 | 0.50 | CRUD and pages over an existing design system. |
| P7 | 0.50 | Same shape as P6. |
| P8 | 0.65 | The 200-case ranking set needs your own labels. |
| P9 | 0.65 | Similar page work with a larger surface. |
| P10 | 0.75 | Failure modes are written down before they occur. |
| P11 | 0.80 | Release evidence is assembled from records the plan already holds. |

The design system sits at P4 so that every domain page consumes it. The agent runtime sits
at P5 so that scope lock reviews a real orchestrator.

## Files added

- `docs/plan/README.md` — index, phase table, how to read the plan.
- `docs/plan/schedule.md` — totals, build rules, phase table, capacity options.
- `docs/plan/claims-ledger.md` — 18 externally verified claims with recheck dates.
- `docs/plan/coverage.md` — all 74 fence-aware spec headings mapped to a plan file.
- `docs/plan/01-architecture.md` to `docs/plan/20-pages-and-automations.md` — one file per
  spec module.

## AirLLM: evaluated and rejected

`lyogavin/airllm`, Apache-2.0. It streams one model layer at a time into GPU memory.
NOVA runs Qwen3.5 2B and 4B as whole models through Ollama. AirLLM would cost seconds
per token. It is a Python library, not an OpenAI-compatible HTTP server. It does not
help NOVA. The plan does not claim that 4 GB VRAM feasibility is settled (ledger C04). Recorded as `evaluated-rejected` at C15 and C16.

## Verified external claims

Ollama model tags, sizes, vision support and the tool-calling loop. Job posting APIs
for Greenhouse, Lever, Ashby and SmartRecruiters. Gmail watch renewal and push payload
format. WhatsApp Cloud API and Telegram webhook signature schemes. LangGraph interrupt
and resume semantics. pgvector Postgres support range. AirLLM and llama.cpp layer
offload behaviour.

## Defects found and fixed

Fourteen rounds of hostile review ran. Two independent reviewers per round. Each round
reported only blocking defects. Every reported defect was fixed or shown to be wrong.

The largest classes of defect:

- A task named an artifact a later phase builds, and did not say so.
- A test asserted something that could not be observed in its own phase.
- A test asserted something that could never fail.
- A spec sub-requirement had no owning task.
- A spec citation named the wrong range or the wrong content.
- An in-phase build order left a prerequisite after its consumer.

Final totals moved several times as tasks were added. The last additions gave four
unowned requirements an owner: audit search (spec:742), the trips operation set
(spec:193), the family 7 operation set (spec:191), and the security test layer
(spec:866, spec:961).

## Language and structure rules applied

ASD-STE100 throughout. Every sentence and every table instruction holds 20 words or
fewer. Passive voice appears only where the agent is unknown. Every file holds a header
comment. Every task table sits under a `## Build sequence` heading.

Exempt from the word limit, because they are data or normative criteria and not prose
instructions: verbatim spec quotes, CSV headers, CSS token lists, state-machine chains,
colon- or dash-introduced item lists, and the ten release invariants in
`18-release-gate.md`.

## Verification

Ran a scripted check over all 24 files. It reports:

- 20 of 20 module total lines equal the sum of their own task rows.
- Phase hours in `schedule.md` agree with the base hours, the phase factor and the
  1.2 contingency. `README.md` holds windows, module files, task counts and exit criteria.
- Grand totals agree: 372 tasks, 2000 base hours, 1271 agent hours, 1529 buffered hours.
- All 18 claims-ledger recheck dates match the start of the phase named in their row.
- 113 quoted spec strings resolve to the spec. 0 unresolved.
- 74 coverage rows, one per fence-aware spec heading.
- 0 files over 200 lines.
- 0 sentences or table instructions over 20 words, outside the documented exemptions.

Reviewer verdicts by round, A then B: 19+12, 9+6, 12+13, 0+18, 4+12, 5+5, 5+10, 2+5,
7+3, 17+7, 3+0, 10+9, 6+7, 4+4. Round 11's reviewer B returned no verdict.

## Open items

Release 1 ends 2027-01-01, one day past the spec deadline. Rounding each phase up to
whole days costs that day. The P4 factor of 0.40 is the most aggressive assumption in
the plan. It leaves about 3 hours of slack across Christmas and New Year.

The cloud and EKS lab stays deferred. It is optional in the spec at lines 438 and 691
and gated by budget. The deferral names four spec items with no build owner: spec:951,
spec:831, spec:438 and spec:677. The plan records this rather than hiding it.

Git holds two commits for this work, b43c410 and e77559d. The current state of
`docs/plan/` sits unstaged on top of them. No further commit is made without approval.
