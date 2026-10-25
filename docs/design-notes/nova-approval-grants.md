# Nova approval grants

Task 4 of Module 08. The approval grant record binds a payload hash, a user, a
target, an expiry and a nonce. This note records the semantics that the code
fixes in place. Date: 2026-10-25.

## Canonical payload binding

The plan test wording is "any byte change invalidates it". The binding is
defined over the **canonical JSON bytes** of the payload object:

- Object keys are sorted by UTF-16 code unit order with a plain sort, never a
  locale compare.
- No whitespace is emitted between tokens.
- Numbers follow ECMAScript `JSON.stringify` semantics.
- `Object.is(-0, 0)` holds: both serialize as `0`.
- Object properties holding `undefined` are omitted. Array items holding
  `undefined` serialize as `null`. This matches `JSON.stringify`.
- The following values throw a `TypeError` instead of collapsing: `NaN`,
  `Infinity`, `BigInt`, cyclic structures, and any non-plain object such as a
  `Date` or a `Map`. A silent collapse would merge distinct payloads into one
  hash.

The rationale: an HTTP body arrives as a parsed object, not raw bytes, and the
domain services that later verify a grant never hold the original request
bytes. With canonical bytes, one changed canonical byte is one changed content
byte, so "any byte change invalidates" holds literally at the canonical layer.
Whitespace edits and key reordering never reach the canonical bytes and stay
valid. The canonicalization authority stays server-side in TypeScript; the
helper lives in `@nova/contracts` export `./approval-hash` so the policy
service and every domain service canonicalize identically. Golden hash vectors
are pinned in `packages/contracts/approval-hash.test.ts`.

## Nonce ownership

Two nonce formats exist and both are deliberate:

- The grants service mints each grant nonce with `crypto.randomBytes(16)` as
  32-char hex. This is the unique grant key.
- The `POST /policy/decide` endpoint emits its own 16-char hex nonce in the
  `needs_approval` response, derived from a hash and a timestamp. That nonce is
  a response token, not a grant key, and the grants service never reuses it.
  Its randomness is weak; task 4 does not change it. A later task may replace
  it with `randomBytes` if the audit requires it.

The uniqueness of the grant key relies on `randomBytes`, not on the timestamp
derivation, so two grants for the same payload never collide on one node.

## Endpoint trust

`POST /policy/grants` and `POST /policy/grants/:nonce/verify` are internal RPC for the
platform. Task 4 has no caller authentication; tasks 7 and 10 own the
cross-service binding and the chat-callback policy story. Expiry is judged by
the server clock only: the verify endpoint strips any caller-supplied `nowMs`
and uses `Date.now()`. The service-level injectable `nowMs` exists for
deterministic tests and trusted internal callers, never for wire input.

## Single-use consumption

Task 5 adds single-use enforcement. The `consumed_at` column (added in migration 24)
is the authoritative consumption state. The `POST /policy/grants/:nonce/consume`
endpoint atomically sets `consumed_at` via a conditional update (`WHERE consumed_at
IS NULL`). The in-memory repository emulates this with a synchronous check-and-set.

`verifyBinding` validates **binding validity only** (payload hash, identity, expiry,
revocation, policy version). It does **not** check consumption status. A consumed
grant's binding remains mathematically valid; callers must use `consumeGrant` to
enforce single-use. This separation keeps binding logic pure and consumption a
separate lifecycle concern.

**Revoked-before-expiry precedence:** `verifyBinding` checks revocation before
expiry. A grant that is both revoked and expired denies as `"revoked"` because
revocation is an explicit admin action with audit semantics that supersedes
natural expiry.

## Revocation

Task 6 adds revocation. The `revoked_at` column (added in migration 24)
is the authoritative revocation state. The `POST /policy/grants/:nonce/revoke`
endpoint atomically sets `revoked_at` via a conditional update
(`WHERE revoked_at IS NULL AND consumed_at IS NULL`). The in-memory
repository emulates this with a synchronous check-and-set.

**Mutually exclusive terminal states:** a grant can be **consumed** OR **revoked**,
never both. The state machine enforces:

- Active → consume → Consumed
- Active → revoke → Revoked
- Consumed → revoke → fails ("already_used")
- Revoked → consume → fails ("already_revoked")
- Revoked → revoke → idempotent success (returns original timestamp)
- Consumed → consume → fails ("already_used")

`verifyBinding` checks revocation before expiry (see precedence above).
A revoked grant denies as `"revoked"` regardless of expiry or consumption.
A consumed grant's binding remains valid (binding validity ≠ consumption).

## Storage status

The DB migration `24-approval-grants.sql` defines the durable shape of the
grant columns. The service keeps grants in an in-memory repository inside
`nova/services/policy-approval-service/src/approval/`, because Postgres is
unavailable on this machine and every existing test suite in the service runs
without a database. The in-memory store is a declared stub; a later task swaps
the repository implementation for a SQL adapter.

Postgres is unavailable locally, so the policy-approval-service tests run and
pass only on developer machines. CI has no policy-service job today.