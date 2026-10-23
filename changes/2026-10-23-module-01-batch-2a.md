# 2026-10-23 — Module 01 batch 2a (tasks 12, 13, 16, task 10 record)

## Scope

Batch 2a of NOVA module 01, per the plan rows 12, 13 and 16, plus the task 10
record. The negation loop closed at round 4. Both negators signed off. No
commit was made; the user commits.

## Task 12 — Versioned service API contract

- New `nova/packages/contracts/service-api.ts`: the deterministic OpenAPI 3.1
  builder. It pins `API_VERSION = 1.0.0` and the route lists of the gateway and
  the TypeScript template. `writeDocument()` writes the committed JSON.
- New `nova/packages/contracts/openapi/api-gateway.json` and
  `openapi/typescript-template.json`. The bytes are the record. The test
  compares the fresh build byte for byte against the committed file.
- New `nova/packages/contracts/service-api.test.ts`: the breaking-change test
  detects a removed route.
- The contracts `package.json` gains the `./service-api` and `./event-envelope`
  export subpaths. The test script runs all four compiled test files. The
  `tsconfig.json` include list gains the six new files.

## Task 13 — Event envelope and record-once consumers

- New `nova/packages/contracts/event-envelope.ts`: the spec:755 envelope with
  `ENVELOPE_SCHEMA_VERSION = 1`, wire field names in the spec order, and the
  base64url transport tokens. A token holds no `=` and no whitespace.
- New `nova/packages/contracts/event-consumers.ts`: `ReceiptsStore`,
  `InMemoryReceipts`, `deliverOnce` and `deliverTokenOnce`. The receipts key is
  the content address of the envelope.
- New test files for both contracts modules.
- New `nova/db/init/03-queue-events.sql`: `jobs_service.queue_outbox` and
  `jobs_service.event_receipts`. Both tables use `AUTHORIZATION jobs_service`.
  The primary keys make a second delivery a no-op. No grant reaches PUBLIC.
- New `nova/tests/security/test_event_delivery.py`: the duplicated-delivery
  proof. It connects as the `jobs_service` role. The tests use the event ids
  `outbox-once`, `delivery-replay` and `delivery-rowcount` to stay independent
  inside one pytest session.
- The `tests/security` Dockerfile CMD gains the third pytest path. The compose
  `tests` service gains the read-only mount for the new pytest.

### Queue rewire (module 01 task 6 owns `services/api-gateway/queues/`)

- New local `nova/services/api-gateway/queues/envelope.mjs`. The runner image
  copies only `queues/`, so a `@nova/contracts` import would dangle. The module
  holds its own envelope encoder with the same field names.
- `enqueue.mjs` now enqueues one base64url envelope token. The envelope is
  built once; the job id and the token both derive from that one object. The
  record line keeps its field names byte-identical, and the token keeps
  `grep -o 'payload=[^ ]*'` working.
- `queue.mjs` drops the superseded `opaquePayload()`. `verify.mjs` is unchanged.
- `ci.yml` and `ci_checks.py` are unchanged. The `outcome=payload_intact`
  marker stays pinned.

## Task 16 — Service map and the record copy

- New `nova/docs/architecture/service-map.md`: the 23 catalogue entries, the
  trust boundary and the role of each unit. Table headers avoid the `Kind`,
  `Catalogue entry` and `Layout path` names, so the checker does not entangle it.
- New `nova/docs/architecture/layout-diff.md`: the copy of the record table.
  All 10 rows match, and no note cites a spec line the record does not.
- Deleted `nova/docs/architecture/.gitkeep`. The directory now holds real files.

## Counts

One measured run of `check_layout.py`: 79 directories, 55 leaf directories,
38 placeholder files. `tree_checks.py` constants and the record sentence in
`docs/layout-diff.md` now state the new counts. Both strings of the
`wrong_leaf_count` mutation move with the record. `repo.md` carries the same
numbers.

## Task 10 — record only

Task 10 needs no code: the gateway and both templates already hold fixed
`/health` endpoints with leak tests. The plan row already records them.

## Verification

- Contracts: 33 tests pass. Gateway: 27 tests pass.
- `check_layout.py`: all 28 checks pass. Measured tree line: 79/55/38.
- Mutation suite: 72 mutations rejected (run in this session).
- `py_compile` and `node --check` pass on every changed script.
- Compose-dependent proofs (the event delivery pytest and the queue restart
  test) run in CI only. Local Docker is unavailable.

## Module 02 note

Module 02 task 9 re-exports the event envelope and adds a backward-compat test
when it lands. This change entry records that duty.
