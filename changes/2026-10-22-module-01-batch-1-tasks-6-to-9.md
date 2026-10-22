# 2026-10-22: Module 01 batch 1 lands tasks 6 to 9

## What changed

- Task 6. `nova/services/api-gateway/queues/` holds the BullMQ queue runner: the
  shared connection, the enqueue script with an opaque payload and the verify
  script. The pinned runner image installs with `npm ci` only and runs non-root.
- Task 7. The compose stack replaces MinIO with RustFS 1.0.3 (Apache-2.0). The
  `object-init` sidecar creates one store, one IAM user and one least-privilege
  policy per synthetic identity over the signed admin API. `nova/tests/security/`
  gains the SigV4 helper and the prefix isolation test: cross-store list and put
  deny 403, own-store actions answer 200.
- Task 8. `nova/packages/contracts/` holds the zero-dependency service identity
  contract. The gateway internal branch verifies service JWTs before the session
  chain and strips caller context headers. Without a configured key the branch
  fails closed.
- Task 9. The compose stack gains the guard probes: the allow probe connects from
  the app network, the deny probe fails from the untrusted network, and each prints
  one record line that CI asserts.
- The CI workflow builds the contracts first, runs both compose files, waits for
  `object-init`, tests the broker restart, and asserts both probe records.

## Why

The build plan rows 6 to 9 named MinIO. MinIO left the public registries, so the
stack runs RustFS instead. The design note `docs/design-notes/nova-object-store.md`
records the switch and the identity model. Ledger row C18 pins the RustFS facts.

## Numbers

- Tree: 78 directories, 55 leaves, 39 placeholders. The checker constants hold the
  measured counts.
- Contracts: 12 tests pass. Gateway: 27 tests pass. All layout checks and 72
  mutations pass.

## Notes

- The gateway `next.config.ts` sets `turbopack.root` to the monorepo root. The
  contracts symlink crosses the service root, and the bundler needs the wider root
  to resolve it.
- Compose validation ran in YAML only. Docker is not available on this machine, so
  the three compose steps prove themselves in CI.
- `ci_checks.py` names the new step markers; `ci_mutations.py` removes steps
  through one shared helper.
