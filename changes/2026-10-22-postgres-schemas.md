# 2026-10-22 — Add Postgres with one schema and one role per service

## Goal

Land module 01 task 5. Add Postgres to the local stack. Every service that owns data holds its
own role and its own schema, and no service can read or write the schema of another service.

## What changed

- Added `nova/infra/compose/compose.yaml`. It holds the `postgres` service and the `tests`
  service. The image is postgres 17.6-alpine with a pinned digest. The cluster has a named volume,
  a health check, resource limits and an internal network. The database publishes no port.
- Added `nova/infra/compose/.env.example`. It holds the synthetic local default of every password.
  The compose file reads `.env` next to it, and git ignores that file. The spec asks for a local
  secret file that git ignores.
- Added `nova/db/init/01-roles.sql`. It creates one role per service that owns data. The password
  of each role arrives from the environment through the psql `\getenv`. The script also names the
  seven services that hold no role, with the reason for each.
- Added `nova/db/init/02-schemas.sql`. It creates one schema per role, owned by that role, and it
  revokes the public schema from `PUBLIC`.
- Added `nova/tests/security/test_database_isolation.py`. It proves that a service reads no table
  of another service, writes no table of another service, creates no object in the schema of
  another service, and opens no other service with the password of that service. It proves that a
  service uses its own schema and that an unqualified table lands in that schema. It proves that
  every service of the catalogue holds a role or a named exclusion, that no service holds both, and
  that every role holds a schema.
- Added `nova/tests/security/requirements.txt` and `nova/tests/security/Dockerfile`. The image
  holds the pinned test dependencies. The compose service mounts the repository at its root, so
  the test reads the spec and the init script at the same paths as the repo.
- `.gitignore`: the local secret file is ignored.
- `.github/workflows/ci.yml`: added a step that runs the database tests inside the compose
  network. The step copies the example secret file first. The teardown runs even when the test
  fails, and the volume is dropped before the run.
- `ci_checks.py`: check AA now requires the compose path. `ci_mutations.py` and `cases.py`: a
  mutation that removes the database step.
- `tree_checks.py`, `record_mutations.py` and `nova/docs/layout-diff.md`: the new tree counts.
- `docs/plan/01-architecture.md` task 5: the row names the test path and the services that own
  data. The risks section records the change.
- `repo.md`: the tree counts, the mutation count and the CI step list.

## Design decisions

- The role list follows the data-ownership column of the catalogue, not the catalogue itself.
  The web app, the gateway, the inference worker, the document service, the job source worker, the
  scheduler worker and the Telegram adapter hold no role. The spec denies a database to the
  inference worker, the document service and the Telegram adapter. The other four own no store.
  The WhatsApp adapter owns the WABA and phone metadata, so it holds a role. The row said "per
  service" and the spec decides. The change is recorded.
- Every role holds its own password. A service that holds one credential cannot open another
  service. The superuser password sits apart from every role password.
- The passwords live in a local secret file that git ignores, and the compose file refuses to
  start when a value is missing. The example file holds the synthetic local defaults. The init
  script holds no password value at all.
- The cluster forces the password on every host connection. The host rule of initdb trusts the
  loopback, and the first match wins, so the trust rule would let a local process act as any
  service. The compose file sets `POSTGRES_INITDB_ARGS` to force the password.
- The database publishes no port. The spec exposes only the web and the API edge. The tests run
  inside the compose network, and the network carries no route to the outside.
- The test image runs as a user that is not root. The release gate asks every image to run that way.
- The image digests are pinned now. The spec asks for pinned images, and the compose file names a
  third-party image that no other task builds.
- The health check asks for the TCP port. The init phase listens on the socket only, so the
  socket check would report healthy before the roles exist.
- The roles are `NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION`. A service role holds no
  right over the cluster.
- The audit role stays writable for its own rows. Module 02 task 4 narrows it to insert-only.
- The metadata of a peer schema stays visible to every role. The table names and the owners are
  readable, the rows are not. This entry records it.
- `pyproject.toml` needs no change, though the plan rule names it for a task that changes the CI
  workflow. The mypy scope and the ruff scope do not change.

## Verification

- The database tests pass against PostgreSQL 17.6. The init scripts ran through psql with the
  environment of the compose file. 12 tests pass. Every role of the catalogue that owns data
  logs in, and no role holds a table grant on the schema of another service.
- The tests pass again in the layout of the test image. The repository sits at the mount root and
  the test resolves the spec and the init script at the same paths as the repo.
- `python3 nova/tests/layout/check_layout.py` passes all 28 checks.
- `python3 nova/tests/layout/test_layout_checks.py` rejects all 68 mutations.
- `ruff check .` passes over the whole repository.
- `mypy nova` passes on the 28 Python modules.
- The tree counts hold at 73 directories, 52 leaf directories and 40 placeholders.

## Open items

- The insert-only audit role lands with module 02 task 4.
- The deployment gives every service its own credential from the secrets manager. Module 17 owns
  that work.
- The compose stack holds the database and the tests. The other services join it as they land.
- The spec:974 compose rules bind module 01 and module 17. The constraints of module 01 now
  quote the line.
