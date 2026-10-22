# 2026-10-22 — Name the model routing policy

## Goal

The developer asked for model switching by task type and requirement. A lightweight task uses the
smaller model. A major task uses the larger model. The orchestration runs in the Python framework.
No step uses one model for everything. The work belongs in the plan.

## What changed

- `docs/plan/05-model-strategy.md`: the goal states the rule. The route picks the model per task
  family. A lightweight family uses the smallest model that clears the floor. A major family uses
  the larger model. The orchestration of the agent runtime runs in Python with LangGraph, and it
  asks the model gateway for the model of the tier.
- `docs/plan/05-model-strategy.md`: a new task 16. It defines the model routing policy. Every task
  family names the model tier it uses. The policy is deterministic and the registry holds it.
  `03-agent-runtime` reads it.
- `docs/plan/05-model-strategy.md`: a new acceptance test. Every task family names a tier, and a
  family that writes, handles finance, qualifications or submission never names the smallest
  model.
- `docs/plan/05-model-strategy.md`: the build order runs task 16 with tasks 1 and 2.
- `docs/plan/05-model-strategy.md`: a new constraint. The spec prefers LangGraph for the durable
  multi-step workflows and LangChain for the provider and tool adapters. Neither framework is a
  security boundary.
- `docs/plan/03-agent-runtime.md`: two new constraints. The spec prefers LangGraph for the
  durable multi-step workflows and LangChain for the provider and tool adapters. The core
  authorisation and execution code stays framework-independent.
- `docs/plan/03-agent-runtime.md` task 5: the deterministic router also names the model tier of
  the task family.
- `docs/plan/03-agent-runtime.md` task 6: the model gateway serves the model of the tier.
- `docs/plan/README.md`: the P3 task count moves from 36 to 37 and the plan total moves from 389
  to 390.
- `repo.md`: the plan task count moves from 389 to 390.

## Design decisions

- The spec already names both frameworks. It prefers LangGraph for the durable multi-step
  workflows at spec:17 and spec:147, and it names LangChain for the provider and tool adapters
  at spec:17. The spec needs no change. The plan now cites those lines.
- The policy is deterministic. The router maps the task family to the tier, and no model chooses
  its own successor.
- The tiers already exist in the candidate table of module 05. The `0.8b` stays a classifier only.
  The `2b` is the default planner. The `4b-q4_K_M` serves the major families. The `9b` is the
  fallback when the `4b` misses the floor and the latency allows it.
- The orchestration stays in Python. The LangGraph state machine of module 03 task 8 holds the
  steps, and each step asks the model gateway for the model of its tier.
- The split follows the spec. The local model strategy holds the shortlist and the floor, and the
  model gateway holds the provider allow-list and the registry.
- The task lands at P3. The registry and the candidate table exist by then, and the router that
  reads the policy lands at P5.

## Verification

- `python3 nova/tests/layout/check_layout.py` passes all 28 checks.
- `python3 nova/tests/layout/test_layout_checks.py` rejects all 68 mutations.
- `ruff check .` passes over the whole repository.
- `mypy nova` passes on the 28 Python modules.

## Open items

- The task families come from the MCP tool catalogue of module 21. The policy names a tier for
  each family once that catalogue holds the final list.
- The floor of every tier comes from the 250-case evaluation set of module 05 task 7.
