# 2026-10-22 — Compose now passes every role password to the database test

## Problem

CI failed on `test_every_role_can_log_in`. It printed:

- `AssertionError: the environment holds no NOVA_PG_PASSWORD_AGENT_ORCHESTRATOR`
- `1 failed, 11 passed`

## Cause

`01-roles.sql` creates 16 database roles. Each role password arrives as a
`NOVA_PG_PASSWORD_<ROLE>` variable. The `postgres` container held all 16, so the init
worked. The `tests` container held only 2. But the test opens an account for every role.
It failed on the first missing password, `agent_orchestrator`. Alphabetically first.

## Fix

`nova/infra/compose/compose.yaml` now holds a shared `x-role-passwords` anchor. It holds
the 16 role password entries with the same `:?` guards. Both services merge the anchor:

- `postgres` keeps `POSTGRES_*` and adds `<<: *role-passwords`.
- `tests` replaces its 2 password lines with `<<: *role-passwords`.

A new role is now one line in one place. Drift between the two lists is impossible.

## Verification

- Python parsed the file with `yaml.safe_load`. Both services hold 16 identical role
  password entries. `tests` keeps its host, port and database values.
- The file is 89 lines.
- Docker is unavailable in the local WSL distro, so `docker compose config` and the
  isolation test must come from CI. The next CI run is the verifier.
- The layout checker only requires that CI names the compose path. It is unchanged.

## Scope

A CI infrastructure config change. The negation loop does not apply to config changes.

## Type

Config.
