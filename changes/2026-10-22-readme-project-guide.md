# 2026-10-22 — README now holds the project guide

## What changed

`README.md` replaced its one-line stub with a project guide. It now holds:

- The project summary of NOVA.
- The service table with status and owning phase for each service.
- The prerequisites: Python 3.12, Node 22.23.4, Docker with Compose, git. Ollama noted as optional for P3 and P5.
- The repo tool install with the pinned ruff 0.17.1 and mypy 2.4.0.
- The repo checks: layout checker, ruff, `mypy nova`.
- The Compose data stack setup: `.env` copy from `.env.example`, `docker compose up -d postgres`, the isolation test with the `test` profile, and the no-published-port note.
- The per-service run instructions. The api-gateway is implemented, so it holds the full commands. The templates hold the copy-and-rename steps.
- The dependency installation table per service type, with the pinned version reference set.
- The secret rules.
- The documentation map.
- The upkeep rule: add a service row, add a run section, update status, update `repo.md`, and add a `changes/` entry when a service lands.

## Facts verified against the repo

- Node 22.23.4 and Python 3.12 come from `ci.yml`.
- ruff 0.17.1 and mypy 2.4.0 come from `ci.yml`.
- The api-gateway commands come from `nova/services/api-gateway/package.json` and its README.
- The Compose steps come from `nova/infra/compose/compose.yaml` and `.env.example`.
- The pinned Python versions come from the template `requirements.txt`.
- mypy runs as `mypy nova`, per `ci.yml`.

## Scope

A documentation change only. No code, no config, no layout change. The negation loop does not apply.

## Type

Documentation.
