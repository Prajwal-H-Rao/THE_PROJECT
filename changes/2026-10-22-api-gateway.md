# 2026-10-22 — Build the api-gateway on Next.js

## Goal

Land module 01 task 4. Build `services/api-gateway/` as the `api-gateway-bff`. It holds the user
session, the request validation, the rate limit, the CSRF and origin checks and the trace ids.

## What changed

- Added `nova/services/api-gateway/`. It is a Next.js 16.4.2 app. It uses the App Router with
  route handlers and the `proxy.ts` file convention. The runtime is the Node.js runtime.
- The proxy holds the request chain. The order is the trace id, the address rate limit, the
  session, the user rate limit, the origin and the CSRF check, and the verified context headers.
  Its matcher covers `/api/:path*`, so the health routes stay public.
- The route handlers are `/health/live`, `/health/ready` and `/api/v1/[...slug]`.
- `src/instrumentation.ts` holds the session secret before the server serves. The production build
  phase skips the hook, so the build never needs the secret. At runtime the hook fails, the
  server never prepares, and every request answers 500.
- The session token is `v1.<base64url payload>.<base64url signature>`. The payload holds `sub`,
  `sid`, `tenant`, `channel`, `csrf`, `iat` and `exp`. The gateway holds no signer.
- The `Session` scheme of the `Authorization` header carries the user token. The `Bearer` scheme
  stays free for the service token of module 01 task 8.
- The CSRF token reaches the browser through the readable `nova_csrf` cookie. The `x-csrf-token`
  header carries it. The origin allow-list comes from `NOVA_ALLOWED_ORIGINS`. An empty list
  allows none.
- The limiter holds two fixed windows and a bounded key map. The sweep runs on write.
- The trace context holds a correlation id and a trace id. The answer carries `x-correlation-id`
  and a `traceparent`.
- The body limit comes from `NOVA_MAX_BODY_BYTES`. The reader counts the bytes and stops a body
  over the limit.
- The client address comes from `x-forwarded-for` at the hop count of `NOVA_TRUST_PROXY`.
- The tests use `node:test` and axios. The axios client has a request interceptor and a response
  interceptor. The tests start the built server on a free port and stop it after.
- `.github/workflows/ci.yml`: added a step that installs the dependencies, builds the app, builds
  the tests and runs them.
- `ci_checks.py`: check AA now requires the gateway path. `ci_mutations.py` and `cases.py`: a
  mutation that removes the gateway step.
- `tree_checks.py`, `record_mutations.py` and `nova/docs/layout-diff.md`: the new tree counts.
- `record_paths.py` and `nova/docs/layout-diff.md`: the design note joins the path groups. The
  record now states 7 groups.
- `ignored_paths.py` and `.gitignore`: `next-env.d.ts` joins the ignored files.
  `path_mutations.py`: the ignored file mutation holds the new list.
- `docs/plan/01-architecture.md`: row 4 names the token contract. The risks section names the
  deferrals. The acceptance test list names the new test.
- `docs/plan/07-identity-authz.md`: task 2 names the `nova_csrf` cookie and the token format.
- `docs/plan/19-tech-and-curriculum.md`: the technology table names the Next.js gateway.
- `docs/design-notes/nova-api-gateway.md`: the deviation note and its reason.
- `repo.md`: the tree counts, the mutation count and the layout entries.
## Design decisions

- The gateway runs on Next.js. The developer chose it. The spec chose NestJS on Fastify for the
  backend TypeScript and rejected Express. The plan technology table now records the deviation
  for this one service, and the design note holds the reason. The other TypeScript services keep
  NestJS on Fastify.
- The `proxy.ts` convention replaced `middleware.ts`. The middleware convention is deprecated in
  Next.js 16. The proxy defaults to the Node.js runtime, so the HMAC verification uses
  `node:crypto`.
- The gateway trusts no client address by default. The Next.js server writes the socket address
  into `x-forwarded-for` only when the client sends no header, so a hop count of 1 would trust
  the value of the client. `NOVA_TRUST_PROXY` holds 0 by default and the address window stays
  off. A deployment behind the edge of module 01 task 17 sets it to the number of hops that
  append to the header, and the edge must append the address it saw.
- The gateway holds no signer and sets no cookie. Module 07 task 2 issues the token and the
  cookies, and its task 18 sets the `Secure`, `HttpOnly` and `SameSite` flags.
- The gateway verifies the session and derives the user id, the tenant scope and the channel
  identity from the verified claims. It deletes any inbound `x-nova-*` header before it sets the
  verified values.
- The token carries no issuer, no audience and no key id. One secret per environment keeps the
  tokens apart. Rotating `NOVA_SESSION_SECRET` ends every session. Module 07 task 9 adds the key
  rotation.
- The limiter stays per process. Module 07 task 14 extends it and adds the lockout.
- The request validation holds the body limit only. The domain routes land with the domain
  services.
- Module 01 task 10 owns the health endpoints of the later services. This task builds the health
  endpoints of the gateway, because the module acceptance test reads them.
- The browser preflight gets 401 until module 07 task 13 adds the CORS response headers.
- The image build stays with module 01 task 14. The Dockerfile needs no work in this task.
- The server binds 127.0.0.1 by default. A deployment sets `NOVA_HOST` and keeps the gateway
  behind the edge of module 01 task 17 and the TLS of module 07 task 18. The server speaks plain
  HTTP until those land.
- `pyproject.toml` needs no change, though the plan rule names it for a task that changes the CI
  workflow. The mypy scope and the ruff scope do not change, and the gateway is TypeScript.
- `ignored_paths.py` and `.gitignore` need no change for the build output. The name `dist` and
  the pattern `nova/services/*/dist/` already exist, and `.next` is an always ignored name.
- The package lock file holds more than 200 lines. It is a generated file and a second
  disclosed exception to the 200-line rule, beside `AGENT_CONFIG.md`.

## Gaps in the plan

The spec names three gateway duties that no plan row owns.

- spec:728 names the request validation. Task 4 covers the body limit of it. No row owns the
  rest.
- spec:728 names the UI-friendly aggregation. No row owns it.
- spec:789 names the input validation. No row owns it.

## Verification

- `npm run build` in the gateway compiles. `next build` runs the type check.
- `npm test` in the gateway passes 21 tests. They start the built server and call it with axios.
- The test build always emits. `tsconfig.test.json` turns off the incremental build, and the
  pretest script fails when the test build is missing, so the gate cannot pass with zero tests.
- `python3 nova/tests/layout/check_layout.py` passes all 28 checks.
- `python3 nova/tests/layout/test_layout_checks.py` rejects all 67 mutations. The four acceptance
  scenarios pass.
- `ruff check .` passes over the whole repository.
- `mypy nova` passes on the 27 Python modules.
- The tree counts hold at 71 directories, 51 leaf directories and 42 placeholders.

## Open items

- The deployment must set `NOVA_TRUST_PROXY` to the number of proxy hops and `NOVA_HOST` to the
  address of the service. Without the first the address window stays off.
- The browser preflight needs the CORS handling of module 07 task 13.
- The token needs the issuer, the audience and the key id when module 07 task 9 lands.
- The image build and the Dockerfile land with module 01 task 14.
